import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { BidMethod, ListingStatus, RegistrationStatus, SaleMethod } from "@/lib/enums";

/** seedSource tag the demo seeder stamps on the always-live demo auction. */
export const DEMO_AUCTION_SEED_SOURCE = "auction-demo";

/** The seeded "always-live" demo auction (active auction listing), if present. */
export async function findDemoAuction(): Promise<
  { id: string; auctionDate: string | null } | null
> {
  const db = await getDb();
  const doc = await db.collection("listings").findOne(
    {
      seedSource: DEMO_AUCTION_SEED_SOURCE,
      "price.method": SaleMethod.Auction,
      status: ListingStatus.Active,
    },
    { projection: { "price.auctionDate": 1 } },
  );
  if (!doc) return null;
  return { id: doc._id.toString(), auctionDate: doc.price?.auctionDate ?? null };
}

/** Re-home the demo auction's start time and clear any persisted close
 *  extension so its close resets to the new start + 1h. */
export async function setDemoAuctionDate(
  id: string,
  auctionDate: string,
): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const db = await getDb();
  const _id = new ObjectId(id);
  await db
    .collection("listings")
    .updateOne({ _id }, { $set: { "price.auctionDate": auctionDate, updatedAt: new Date() } });
  await db.collection("auction_state").deleteOne({ _id });
}

/**
 * Data access for "register to bid" records. Each registration stores a small
 * listing snapshot (title/locality/city) so the owner's view renders without a
 * join — the same pattern as `leads.repository.ts`.
 */
export interface RegistrationDoc {
  _id: ObjectId;
  listingId: ObjectId;
  ownerId: ObjectId;
  bidderId: ObjectId;
  name: string;
  phone: string;
  email?: string;
  bidMethod: BidMethod;
  status: RegistrationStatus;
  listingTitle: string;
  listingLocality: string;
  listingCity: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Registration = Omit<
  RegistrationDoc,
  "_id" | "listingId" | "ownerId" | "bidderId" | "createdAt" | "updatedAt"
> & {
  id: string;
  listingId: string;
  ownerId: string;
  bidderId: string;
  createdAt: string;
  updatedAt: string;
};

async function collection(): Promise<Collection<RegistrationDoc>> {
  const db = await getDb();
  return db.collection<RegistrationDoc>("auction_registrations");
}

export function toRegistration(doc: RegistrationDoc): Registration {
  const { _id, listingId, ownerId, bidderId, createdAt, updatedAt, ...rest } =
    doc;
  return {
    ...rest,
    id: _id.toString(),
    listingId: listingId.toString(),
    ownerId: ownerId.toString(),
    bidderId: bidderId.toString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export interface NewRegistration {
  listingId: string;
  ownerId: string;
  bidderId: string;
  name: string;
  phone: string;
  email?: string;
  bidMethod: BidMethod;
  listingTitle: string;
  listingLocality: string;
  listingCity: string;
}

export async function insertRegistration(
  input: NewRegistration,
): Promise<Registration> {
  const col = await collection();
  const now = new Date();
  const doc: RegistrationDoc = {
    _id: new ObjectId(),
    listingId: new ObjectId(input.listingId),
    ownerId: new ObjectId(input.ownerId),
    bidderId: new ObjectId(input.bidderId),
    name: input.name,
    phone: input.phone,
    email: input.email,
    bidMethod: input.bidMethod,
    status: RegistrationStatus.Pending,
    listingTitle: input.listingTitle,
    listingLocality: input.listingLocality,
    listingCity: input.listingCity,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return toRegistration(doc);
}

/**
 * Whether this bidder has a registration for this listing. With
 * `excludeDeclined`, a Declined registration does NOT count (used at the bidding
 * gate so a declined bidder can't bid); the plain form is used for the
 * duplicate-registration check.
 */
export async function existsRegistration(
  bidderId: string,
  listingId: string,
  opts: { excludeDeclined?: boolean } = {},
): Promise<boolean> {
  if (!ObjectId.isValid(bidderId) || !ObjectId.isValid(listingId)) return false;
  const col = await collection();
  const filter: Record<string, unknown> = {
    bidderId: new ObjectId(bidderId),
    listingId: new ObjectId(listingId),
  };
  if (opts.excludeDeclined) filter.status = { $ne: RegistrationStatus.Declined };
  const found = await col.findOne(filter, { projection: { _id: 1 } });
  return found !== null;
}

export async function findRegistrationById(
  id: string,
): Promise<Registration | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? toRegistration(doc) : null;
}

export async function findRegistrationsByListing(
  listingId: string,
): Promise<Registration[]> {
  if (!ObjectId.isValid(listingId)) return [];
  const col = await collection();
  const docs = await col
    .find({ listingId: new ObjectId(listingId) })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toRegistration);
}

export async function findRegistrationsByBidder(
  bidderId: string,
): Promise<Registration[]> {
  if (!ObjectId.isValid(bidderId)) return [];
  const col = await collection();
  const docs = await col
    .find({ bidderId: new ObjectId(bidderId) })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toRegistration);
}

export async function updateRegistrationStatus(
  id: string,
  status: RegistrationStatus,
): Promise<Registration | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return doc ? toRegistration(doc) : null;
}

/** Number of registered bidders on a listing (drives the "N registered" stat). */
export async function countRegistrationsByListing(
  listingId: string,
): Promise<number> {
  if (!ObjectId.isValid(listingId)) return 0;
  const col = await collection();
  return col.countDocuments({ listingId: new ObjectId(listingId) });
}

/* ── bids ──────────────────────────────────────────────────────────────────
 * One document per placed bid (manual or proxy). Bids only ever increase, so
 * the high bid is simply the max `amount` for the listing.                     */

export interface BidDoc {
  _id: ObjectId;
  listingId: ObjectId;
  bidderId: ObjectId;
  bidderName: string;
  amount: number;
  /** True when placed by the proxy/auto-bid engine rather than a click. */
  auto: boolean;
  createdAt: Date;
}

export type Bid = {
  id: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  auto: boolean;
  createdAt: string;
};

async function bidsCollection(): Promise<Collection<BidDoc>> {
  const db = await getDb();
  return db.collection<BidDoc>("bids");
}

function toBid(doc: BidDoc): Bid {
  return {
    id: doc._id.toString(),
    bidderId: doc.bidderId.toString(),
    bidderName: doc.bidderName,
    amount: doc.amount,
    auto: doc.auto,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function insertBid(input: {
  listingId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  auto?: boolean;
}): Promise<Bid> {
  const col = await bidsCollection();
  const doc: BidDoc = {
    _id: new ObjectId(),
    listingId: new ObjectId(input.listingId),
    bidderId: new ObjectId(input.bidderId),
    bidderName: input.bidderName,
    amount: input.amount,
    auto: input.auto ?? false,
    createdAt: new Date(),
  };
  await col.insertOne(doc);
  return toBid(doc);
}

/** The current highest bid for a listing, or null when there are none. */
export async function getHighBid(listingId: string): Promise<Bid | null> {
  if (!ObjectId.isValid(listingId)) return null;
  const col = await bidsCollection();
  const doc = await col
    .find({ listingId: new ObjectId(listingId) })
    .sort({ amount: -1, createdAt: 1 })
    .limit(1)
    .next();
  return doc ? toBid(doc) : null;
}

export async function listRecentBids(
  listingId: string,
  limit = 6,
): Promise<Bid[]> {
  if (!ObjectId.isValid(listingId)) return [];
  const col = await bidsCollection();
  const docs = await col
    .find({ listingId: new ObjectId(listingId) })
    .sort({ createdAt: -1, amount: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toBid);
}

export async function countBids(listingId: string): Promise<number> {
  if (!ObjectId.isValid(listingId)) return 0;
  const col = await bidsCollection();
  return col.countDocuments({ listingId: new ObjectId(listingId) });
}

/* ── auto-bids (proxy ceilings) ─────────────────────────────────────────────
 * One active ceiling per (listing, bidder). The proxy engine bids on their
 * behalf up to this amount.                                                     */

export interface AutoBidDoc {
  _id: ObjectId;
  listingId: ObjectId;
  bidderId: ObjectId;
  bidderName: string;
  maxAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type AutoBid = {
  bidderId: string;
  bidderName: string;
  maxAmount: number;
};

async function autoBidsCollection(): Promise<Collection<AutoBidDoc>> {
  const db = await getDb();
  return db.collection<AutoBidDoc>("auto_bids");
}

export async function upsertAutoBid(input: {
  listingId: string;
  bidderId: string;
  bidderName: string;
  maxAmount: number;
}): Promise<void> {
  const col = await autoBidsCollection();
  const now = new Date();
  await col.updateOne(
    {
      listingId: new ObjectId(input.listingId),
      bidderId: new ObjectId(input.bidderId),
    },
    {
      $set: {
        bidderName: input.bidderName,
        maxAmount: input.maxAmount,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function deleteAutoBid(
  listingId: string,
  bidderId: string,
): Promise<void> {
  if (!ObjectId.isValid(listingId) || !ObjectId.isValid(bidderId)) return;
  const col = await autoBidsCollection();
  await col.deleteOne({
    listingId: new ObjectId(listingId),
    bidderId: new ObjectId(bidderId),
  });
}

export async function getAutoBidFor(
  listingId: string,
  bidderId: string,
): Promise<AutoBid | null> {
  if (!ObjectId.isValid(listingId) || !ObjectId.isValid(bidderId)) return null;
  const col = await autoBidsCollection();
  const doc = await col.findOne({
    listingId: new ObjectId(listingId),
    bidderId: new ObjectId(bidderId),
  });
  return doc
    ? { bidderId: doc.bidderId.toString(), bidderName: doc.bidderName, maxAmount: doc.maxAmount }
    : null;
}

export async function listAutoBids(listingId: string): Promise<AutoBid[]> {
  if (!ObjectId.isValid(listingId)) return [];
  const col = await autoBidsCollection();
  const docs = await col.find({ listingId: new ObjectId(listingId) }).toArray();
  return docs.map((d) => ({
    bidderId: d.bidderId.toString(),
    bidderName: d.bidderName,
    maxAmount: d.maxAmount,
  }));
}

/* ── auction runtime state (mutable close time + high-bid watermark) ──────────
 * One doc per listing. `basis` records the auctionDate the runtime values were
 * computed from, so a persisted closeAt is ignored once the auction is
 * rescheduled. `highAmount` is a monotonic watermark used to claim the high bid
 * atomically (see claimHighBid).                                                */

interface AuctionStateDoc {
  _id: ObjectId; // == listingId
  basis?: string;
  closeAt?: Date;
  highAmount?: number;
  updatedAt: Date;
}

async function stateCollection(): Promise<Collection<AuctionStateDoc>> {
  const db = await getDb();
  return db.collection<AuctionStateDoc>("auction_state");
}

/** Persisted close time + the auctionDate it was computed from (null if unset). */
export async function getAuctionRuntime(
  listingId: string,
): Promise<{ closeAt: Date | null; basis: string | null }> {
  if (!ObjectId.isValid(listingId)) return { closeAt: null, basis: null };
  const col = await stateCollection();
  const doc = await col.findOne({ _id: new ObjectId(listingId) });
  return { closeAt: doc?.closeAt ?? null, basis: doc?.basis ?? null };
}

/** Extend the close time. Monotonic ($max) so it can only ever move LATER, and
 *  tagged with `basis` so a reschedule invalidates it. */
export async function setAuctionCloseAt(
  listingId: string,
  basis: string,
  closeAt: Date,
): Promise<void> {
  if (!ObjectId.isValid(listingId)) return;
  const col = await stateCollection();
  await col.updateOne(
    { _id: new ObjectId(listingId) },
    { $max: { closeAt }, $set: { basis, updatedAt: new Date() } },
    { upsert: true },
  );
}

/**
 * Atomically claim the high bid at `amount`. Returns true only if `amount`
 * strictly beats the committed high (or it's the first bid) — the monotonic
 * guard that makes concurrent bids safe even at DIFFERENT amounts (the unique
 * {listingId, amount} index alone only catches identical amounts).
 */
export async function claimHighBid(
  listingId: string,
  amount: number,
): Promise<boolean> {
  if (!ObjectId.isValid(listingId)) return false;
  const col = await stateCollection();
  try {
    const doc = await col.findOneAndUpdate(
      {
        _id: new ObjectId(listingId),
        $or: [{ highAmount: { $exists: false } }, { highAmount: { $lt: amount } }],
      },
      { $set: { highAmount: amount, updatedAt: new Date() } },
      { upsert: true, returnDocument: "after" },
    );
    return doc?.highAmount === amount;
  } catch (err) {
    // Doc exists with a >= high (filter no-match → upsert collides on _id), or a
    // first-bid race lost the insert — either way this bid didn't win the claim.
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      return false;
    }
    throw err;
  }
}
