/**
 * Pure, framework-free helpers + shared types for live bidding. Safe to import
 * from the server (service/repository) and client (the bidding panel) alike —
 * no React, no DB, no `Date.now()` at module scope.
 */

export type AuctionLivePhase = "upcoming" | "live" | "ended";

/** One bid as shown to the public — bidder name is masked server-side. */
export type AuctionBidView = {
  name: string;
  amount: number;
  at: string; // ISO timestamp
  you: boolean;
};

/** The full live-auction snapshot returned by GET /api/listings/:id/bids. */
export type AuctionState = {
  phase: AuctionLivePhase;
  auctionDate: string;
  /** Absolute start instant (ISO, UTC) — for a TZ-correct "starts in" countdown. */
  startsAt: string;
  /** When bidding closes (start + window, possibly extended by anti-sniping). */
  endsAt: string;
  currentBid: number | null;
  /** Opening bid when there are no bids yet (the listing's headline amount). */
  startingBid: number;
  /** Smallest legal next bid. */
  minNextBid: number;
  increment: number;
  bidCount: number;
  registeredBidders: number;
  watching: number;
  reserveMet: boolean;
  hasReserve: boolean;
  recentBids: AuctionBidView[];
  viewer: {
    signedIn: boolean;
    isOwner: boolean;
    registered: boolean;
    isHighBidder: boolean;
    autoBidMax: number | null;
  };
  antiSnipingMinutes: number;
};

/** Minutes of "anti-sniping" — a late bid pushes the close out by this much. */
export const ANTI_SNIPE_MINUTES = 2;

/**
 * Minimum bid increment for a given current amount (NZ auctioneer-style tiers).
 * The auctioneer sets increments on the day; this is a sensible default ladder.
 */
export function minBidIncrement(amount: number): number {
  if (amount < 200_000) return 5_000;
  if (amount < 500_000) return 10_000;
  if (amount < 1_000_000) return 20_000;
  if (amount < 2_000_000) return 25_000;
  return 50_000;
}

/** The smallest legal next bid given the current high (or the opening floor).
 *  When no opening figure is set (startingBid <= 0) we floor the FIRST bid to one
 *  increment so an auction can't open at a trivial $1. */
export function minNextBid(currentBid: number | null, startingBid: number): number {
  if (currentBid == null) return startingBid > 0 ? startingBid : minBidIncrement(0);
  return currentBid + minBidIncrement(currentBid);
}

/**
 * Mask a bidder's name for public display, auction-room style:
 *   "Tina Reweti" -> "T**a R."   "Sam"-> "S**"   "Anon bidder 7" -> "A**n b."
 * Keeps the first token's first/last letter, plus initials of later tokens.
 */
export function maskBidderName(name: string): string {
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "Bidder";

  const [first, ...rest] = tokens;
  let maskedFirst: string;
  if (first.length <= 1) maskedFirst = `${first.toUpperCase()}*`;
  else if (first.length === 2)
    maskedFirst = `${first[0].toUpperCase()}*`;
  else
    maskedFirst = `${first[0].toUpperCase()}**${first[first.length - 1].toLowerCase()}`;

  const initials = rest
    .map((t) => (t[0] ? `${t[0].toUpperCase()}.` : ""))
    .filter(Boolean)
    .join(" ");

  return initials ? `${maskedFirst} ${initials}` : maskedFirst;
}
