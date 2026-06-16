import { ListingStatus, SaleMethod, UserRole } from "@/lib/enums";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/guards";
import {
  findListingById,
  type Listing,
} from "@/features/listings/listings.repository";
import { countFavoritesByListings } from "@/features/favorites/favorites.repository";
import {
  auctionPhase,
  AUCTION_LIVE_MS,
  nzWallClockToInstant,
  toNzWallClock,
} from "./auction-window";
import {
  ANTI_SNIPE_MINUTES,
  maskBidderName,
  minBidIncrement,
  minNextBid,
  type AuctionState,
} from "./bidding";
import {
  claimHighBid,
  countBids,
  countRegistrationsByListing,
  deleteAutoBid,
  DEMO_AUCTION_SEED_SOURCE,
  existsRegistration,
  findDemoAuction,
  findRegistrationById,
  findRegistrationsByBidder,
  findRegistrationsByListing,
  getAuctionRuntime,
  getAutoBidFor,
  getHighBid,
  insertBid,
  insertRegistration,
  listAutoBids,
  listRecentBids,
  setAuctionCloseAt,
  setDemoAuctionDate,
  updateRegistrationStatus,
  upsertAutoBid,
  type Registration,
} from "./auctions.repository";
import type { CreateRegistrationInput } from "./auctions.schema";
import type { RegistrationStatus } from "@/lib/enums";

/**
 * Business logic for auctions. Registering to bid requires a signed-in user
 * (`bidder`); the bidder identity comes from the session, never the client.
 * Throws AppError subclasses for the controller to map to HTTP.
 */
export async function registerToBid(
  bidder: CurrentUser,
  input: CreateRegistrationInput,
): Promise<Registration> {
  const listing = await findListingById(input.listingId);
  if (!listing || listing.status !== ListingStatus.Active) {
    throw new NotFoundError("Auction not found");
  }
  if (listing.price.method !== SaleMethod.Auction || !listing.price.auctionDate) {
    throw new BadRequestError("This listing isn't an auction");
  }
  if (auctionPhase(listing.price.auctionDate) === "ended") {
    throw new BadRequestError("This auction has already ended");
  }
  if (bidder.id === listing.ownerId) {
    throw new BadRequestError("You can't register to bid on your own auction");
  }
  if (await existsRegistration(bidder.id, listing.id)) {
    throw new BadRequestError(
      "You're already registered to bid on this auction",
    );
  }

  return insertRegistration({
    listingId: listing.id,
    ownerId: listing.ownerId,
    bidderId: bidder.id,
    name: input.name,
    phone: input.phone,
    email: input.email || undefined,
    bidMethod: input.bidMethod,
    listingTitle: listing.title,
    listingLocality: listing.location.locality,
    listingCity: listing.location.city,
  });
}

/** Registrations a bidder has made (their "auctions I'm registered for"). */
export async function listMyRegistrations(
  bidder: CurrentUser,
): Promise<Registration[]> {
  return findRegistrationsByBidder(bidder.id);
}

/** Registrations on a listing — owner/admin only (manage who can bid). */
export async function listListingRegistrations(
  user: CurrentUser,
  listingId: string,
): Promise<Registration[]> {
  const listing = await findListingById(listingId);
  if (!listing) throw new NotFoundError("Auction not found");
  if (listing.ownerId !== user.id && user.role !== UserRole.Admin) {
    throw new ForbiddenError("You can only manage your own auctions");
  }
  return findRegistrationsByListing(listingId);
}

/** Approve/decline a registration — owner/admin only. */
export async function changeRegistrationStatus(
  user: CurrentUser,
  id: string,
  status: RegistrationStatus,
): Promise<Registration> {
  const registration = await findRegistrationById(id);
  if (!registration) throw new NotFoundError("Registration not found");
  if (registration.ownerId !== user.id && user.role !== UserRole.Admin) {
    throw new ForbiddenError("You can only manage your own auctions");
  }
  const updated = await updateRegistrationStatus(id, status);
  if (!updated) throw new NotFoundError("Registration not found");
  return updated;
}

/* ── always-live demo auction ─────────────────────────────────────────────────
 * The seeder plants ONE demo auction (seedSource "auction-demo") that should read
 * as "live" at all times — locally and in production — without a cron or a
 * long-running refresher. We keep it live lazily: whenever an auction surface is
 * rendered, if the demo's start time has drifted out of the live window we nudge
 * it back to a couple of minutes ago. Idempotent, best-effort, and only ever
 * touches that single seeded row.                                                */

/** True when this listing is the seeded always-live demo auction. */
export function isDemoAuction(listing: Listing): boolean {
  return (
    (listing as { seedSource?: string }).seedSource === DEMO_AUCTION_SEED_SOURCE
  );
}

/** Keep the seeded demo auction permanently "live" (no-op if there's no demo or
 *  it's already live). Safe to call on any auction page render. */
export async function ensureDemoAuctionLive(now: Date = new Date()): Promise<void> {
  try {
    const demo = await findDemoAuction();
    if (!demo) return;
    if (demo.auctionDate && auctionPhase(demo.auctionDate, now) === "live") return;
    // Start two minutes ago → unambiguously live, ~58 min before it drifts again.
    await setDemoAuctionDate(
      demo.id,
      toNzWallClock(new Date(now.getTime() - 2 * 60 * 1000)),
    );
  } catch {
    /* demo convenience only — never block a page render on it. */
  }
}

/* ── live bidding ──────────────────────────────────────────────────────────── */

const ANTI_SNIPE_MS = ANTI_SNIPE_MINUTES * 60 * 1000;
const PROXY_MAX_ITERATIONS = 40; // backstop for the auto-bid resolution loop

/** Load + validate that a listing is an active auction; returns the listing. */
async function getAuctionListing(listingId: string): Promise<Listing> {
  const listing = await findListingById(listingId);
  if (!listing) throw new NotFoundError("Auction not found");
  if (listing.price.method !== SaleMethod.Auction || !listing.price.auctionDate) {
    throw new NotFoundError("This listing isn't an auction");
  }
  if (listing.status !== ListingStatus.Active) {
    throw new BadRequestError("This auction is no longer available.");
  }
  return listing;
}

/** Opening bid floor — the listing's headline amount, price guide, or RV. */
function startingBidFor(listing: Listing): number {
  return (
    listing.price.amount || listing.price.priceGuide || listing.rateableValue || 0
  );
}

/**
 * Resolve start/close/phase. `auctionDate` is an offset-less NZ wall-clock
 * string, so it's converted to an absolute instant via Pacific/Auckland — phase
 * decisions are then correct on any host timezone. A persisted close time is only
 * honoured when it was computed from the CURRENT auctionDate (reschedule-safe).
 */
async function timing(listing: Listing, now: Date) {
  const startMs = nzWallClockToInstant(listing.price.auctionDate as string);
  // Unparseable date → treat as upcoming (matches auctionPhase), never "ended".
  if (Number.isNaN(startMs)) {
    const farFuture = new Date(now.getTime() + AUCTION_LIVE_MS);
    return { start: farFuture, closeAt: farFuture, phase: "upcoming" as const };
  }
  const start = new Date(startMs);
  const defaultClose = new Date(startMs + AUCTION_LIVE_MS);
  const runtime = await getAuctionRuntime(listing.id);
  const closeAt =
    runtime.closeAt && runtime.basis === listing.price.auctionDate
      ? runtime.closeAt
      : defaultClose;
  const t = now.getTime();
  const phase: AuctionState["phase"] =
    t < start.getTime() ? "upcoming" : t < closeAt.getTime() ? "live" : "ended";
  return { start, closeAt, phase };
}

/**
 * Full live snapshot for the bidding panel. Reads the SECRET reserve to derive a
 * `reserveMet` boolean — the figure itself never leaves the server.
 */
export async function getAuctionState(
  listingId: string,
  viewer: CurrentUser | null,
): Promise<AuctionState> {
  let listing = await getAuctionListing(listingId);
  const now = new Date();
  // Keep the demo auction live on its own detail page too (cost only for the demo).
  if (isDemoAuction(listing) && auctionPhase(listing.price.auctionDate as string, now) !== "live") {
    await ensureDemoAuctionLive(now);
    listing = await getAuctionListing(listingId);
  }
  const { start, closeAt, phase } = await timing(listing, now);

  const startingBid = startingBidFor(listing);
  const high = await getHighBid(listing.id);
  const currentBid = high?.amount ?? null;

  const reserve = listing.price.reserve;
  const hasReserve = reserve != null;
  const reserveMet = hasReserve && currentBid != null && currentBid >= reserve;

  const [bidCount, registeredBidders, favCounts, recent] = await Promise.all([
    countBids(listing.id),
    countRegistrationsByListing(listing.id),
    countFavoritesByListings([listing.id]),
    listRecentBids(listing.id, 6),
  ]);

  const registered = viewer
    ? await existsRegistration(viewer.id, listing.id, { excludeDeclined: true })
    : false;
  const autoBid = viewer ? await getAutoBidFor(listing.id, viewer.id) : null;

  return {
    phase,
    auctionDate: listing.price.auctionDate as string,
    startsAt: start.toISOString(),
    endsAt: closeAt.toISOString(),
    currentBid,
    startingBid,
    minNextBid: minNextBid(currentBid, startingBid),
    increment: minBidIncrement(currentBid ?? startingBid),
    bidCount,
    registeredBidders,
    watching: favCounts[listing.id] ?? 0,
    reserveMet,
    hasReserve,
    recentBids: recent.map((b) => ({
      name: maskBidderName(b.bidderName),
      amount: b.amount,
      at: b.createdAt,
      you: viewer?.id === b.bidderId,
    })),
    viewer: {
      signedIn: !!viewer,
      isOwner: viewer?.id === listing.ownerId,
      registered,
      isHighBidder: !!viewer && high?.bidderId === viewer.id,
      autoBidMax: autoBid?.maxAmount ?? null,
    },
    antiSnipingMinutes: ANTI_SNIPE_MINUTES,
  };
}

/** Shared gate: a signed-in, registered, non-owner bidder on a LIVE auction. */
async function assertCanBid(
  listing: Listing,
  bidder: CurrentUser,
  now: Date,
): Promise<void> {
  const { phase } = await timing(listing, now);
  if (phase !== "live") {
    throw new BadRequestError(
      phase === "upcoming"
        ? "Bidding hasn't opened yet."
        : "This auction has closed.",
    );
  }
  if (bidder.id === listing.ownerId) {
    throw new BadRequestError("You can't bid on your own auction.");
  }
  if (!(await existsRegistration(bidder.id, listing.id, { excludeDeclined: true }))) {
    throw new ForbiddenError("Register to bid before placing a bid.");
  }
}

/**
 * Place a manual bid. Validates live + registered + amount ≥ min next bid,
 * extends the close time if it lands inside the anti-snipe window, then lets the
 * proxy engine counter on behalf of any auto-bidders.
 */
export async function placeBid(
  bidder: CurrentUser,
  listingId: string,
  amount: number,
): Promise<AuctionState> {
  const listing = await getAuctionListing(listingId);
  const now = new Date();
  await assertCanBid(listing, bidder, now);

  const startingBid = startingBidFor(listing);
  const high = await getHighBid(listing.id);
  const required = minNextBid(high?.amount ?? null, startingBid);
  if (amount < required) {
    throw new BadRequestError(
      `Your bid must be at least $${required.toLocaleString("en-NZ")}.`,
    );
  }

  // Atomically claim the high at this amount BEFORE inserting, so a concurrent
  // bid at a different amount can't slip in below the committed high.
  if (!(await claimHighBid(listing.id, amount))) {
    throw new BadRequestError("Another bid just landed — refresh and try again.");
  }
  try {
    await insertBid({
      listingId: listing.id,
      bidderId: bidder.id,
      bidderName: bidder.name,
      amount,
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw new BadRequestError(
        "Another bid just landed — refresh and try again.",
      );
    }
    throw err;
  }

  await extendCloseIfSniping(listing, now);
  await resolveAutoBids(listing.id, startingBid, bidder.id);

  return getAuctionState(listing.id, bidder);
}

/** Set or clear the viewer's proxy ("auto-bid") ceiling, then resolve proxies. */
export async function setAutoBid(
  bidder: CurrentUser,
  listingId: string,
  maxAmount: number | null,
): Promise<AuctionState> {
  const listing = await getAuctionListing(listingId);
  const now = new Date();

  if (maxAmount == null) {
    await deleteAutoBid(listing.id, bidder.id);
    return getAuctionState(listing.id, bidder);
  }

  await assertCanBid(listing, bidder, now);
  const startingBid = startingBidFor(listing);
  const high = await getHighBid(listing.id);
  const required = minNextBid(high?.amount ?? null, startingBid);
  if (maxAmount < required) {
    throw new BadRequestError(
      `Your maximum must be at least $${required.toLocaleString("en-NZ")}.`,
    );
  }

  await upsertAutoBid({
    listingId: listing.id,
    bidderId: bidder.id,
    bidderName: bidder.name,
    maxAmount,
  });
  await resolveAutoBids(listing.id, startingBid, bidder.id);

  return getAuctionState(listing.id, bidder);
}

/** Push the close time out by the anti-snipe window if a bid lands near close. */
async function extendCloseIfSniping(listing: Listing, now: Date): Promise<void> {
  const { closeAt } = await timing(listing, now);
  if (closeAt.getTime() - now.getTime() <= ANTI_SNIPE_MS) {
    await setAuctionCloseAt(
      listing.id,
      listing.price.auctionDate as string,
      new Date(now.getTime() + ANTI_SNIPE_MS),
    );
  }
}

/**
 * eBay-style proxy resolution in PRICE SPACE (one jump, not an increment walk):
 * the highest-ceiling auto-bidder (other than the current leader) takes the lead
 * at just enough to beat the runner-up's ceiling — capped at their own max, and
 * never below the legal next bid. When a higher ceiling can't make a full
 * increment but can still beat the current high, it bids its max (cap-to-max) so
 * the highest ceiling always wins. Bounded by `PROXY_MAX_ITERATIONS`.
 */
async function resolveAutoBids(
  listingId: string,
  startingBid: number,
  triggeredBy: string,
): Promise<void> {
  for (let i = 0; i < PROXY_MAX_ITERATIONS; i++) {
    const high = await getHighBid(listingId);
    const leaderId = high?.bidderId ?? null;
    const currentAmt = high?.amount ?? null;

    // ALL auto-bidders, strongest ceiling first (the just-acted human breaks
    // ties so an equal ceiling can't leapfrog them).
    const autos = (await listAutoBids(listingId)).sort(
      (a, b) =>
        b.maxAmount - a.maxAmount ||
        (a.bidderId === triggeredBy ? -1 : 0) -
          (b.bidderId === triggeredBy ? -1 : 0),
    );
    if (autos.length === 0) break;

    const top = autos[0];
    // The strongest-ceiling auto-bidder already leads → settled.
    if (top.bidderId === leaderId) break;
    // Even the top ceiling can't beat the current high → no proxy bid possible.
    if (currentAmt != null && top.maxAmount <= currentAmt) break;

    // Clearing price = one increment over the strongest competing interest (the
    // current high or the runner-up ceiling, whichever is greater), but at least
    // the legal floor and never above the winner's own max (cap-to-max). This is
    // the eBay single-jump, so the loop runs O(#auto-bidders), not O(price gap).
    const secondCeiling = autos[1]?.maxAmount ?? 0;
    const competing = Math.max(currentAmt ?? 0, secondCeiling);
    const floor = minNextBid(currentAmt, startingBid);
    const clearing = Math.min(
      top.maxAmount,
      Math.max(competing + minBidIncrement(competing), floor),
    );

    // No bids yet → must meet the opening floor; otherwise → must beat the high.
    if (currentAmt == null ? clearing < floor : clearing <= currentAmt) break;

    if (!(await claimHighBid(listingId, clearing))) continue; // price moved
    try {
      await insertBid({
        listingId,
        bidderId: top.bidderId,
        bidderName: top.bidderName,
        amount: clearing,
        auto: true,
      });
    } catch (err) {
      if (isDuplicateKey(err)) continue; // exact amount taken — re-read & retry
      throw err;
    }
  }
}

/** True for a MongoDB duplicate-key (E11000) error. */
function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}
