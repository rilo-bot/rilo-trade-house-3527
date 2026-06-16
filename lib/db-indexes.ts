import { Db } from "mongodb";

/**
 * Centralised index creation. Run once per process from `connectToDatabase()`
 * (see lib/db.ts) so every collection the app queries is backed by an index
 * instead of falling back to a full collection scan.
 *
 * `createIndex` is idempotent — creating an index that already exists is a cheap
 * no-op — so this is safe to call on every cold start. Failures are logged but
 * never block the connection (a missing index degrades performance, not
 * correctness).
 */
export async function ensureIndexes(db: Db): Promise<void> {
  try {
    await Promise.all([
      // ── listings ──
      // Public search default (status filter + newest-first sort).
      db.collection("listings").createIndex({ status: 1, createdAt: -1 }),
      // Price sort within active listings.
      db.collection("listings").createIndex({ status: 1, "price.amount": 1 }),
      // Owner's "my listings" (filtered by ownerId, newest-first).
      db.collection("listings").createIndex({ ownerId: 1, createdAt: -1 }),
      // Region/district/suburb filters + the insights locality aggregation.
      db
        .collection("listings")
        .createIndex({
          status: 1,
          "location.state": 1,
          "location.city": 1,
          "location.locality": 1,
        }),
      // Listing-type filter + home-page type counts.
      db.collection("listings").createIndex({ status: 1, listingType: 1 }),
      // Advanced-search sorts: rateable value (CV) and land/floor area (m²).
      db.collection("listings").createIndex({ status: 1, rateableValue: 1 }),
      db
        .collection("listings")
        .createIndex({ status: 1, "landArea.valueSqm": 1 }),
      db.collection("listings").createIndex({ status: 1, "area.valueSqm": 1 }),
      // Auction-date window filter + "Auction: soonest" sort.
      db
        .collection("listings")
        .createIndex({ status: 1, "price.auctionDate": 1 }),
      // NOTE: the `location.geo` 2dsphere index is added in Phase 4, alongside
      // storing geo in a GeoJSON-compatible format.

      // ── auction_registrations ──
      // Owner's "who registered" view + bidder's "auctions I'm in" + one
      // registration per bidder per listing.
      db
        .collection("auction_registrations")
        .createIndex({ listingId: 1, createdAt: -1 }),
      db
        .collection("auction_registrations")
        .createIndex({ bidderId: 1, createdAt: -1 }),
      db
        .collection("auction_registrations")
        .createIndex({ listingId: 1, bidderId: 1 }, { unique: true }),

      // ── bids ──
      // High bid (max amount per listing) + uniqueness guards against two bids
      // landing on the exact same amount in a race.
      db.collection("bids").createIndex({ listingId: 1, amount: 1 }, { unique: true }),
      // Recent-bids feed (newest first).
      db.collection("bids").createIndex({ listingId: 1, createdAt: -1 }),

      // ── auto_bids ── one proxy ceiling per (listing, bidder).
      db
        .collection("auto_bids")
        .createIndex({ listingId: 1, bidderId: 1 }, { unique: true }),

      // ── leads ──
      db.collection("leads").createIndex({ ownerId: 1, createdAt: -1 }),
      db.collection("leads").createIndex({ seekerId: 1, createdAt: -1 }),
      db.collection("leads").createIndex({ listingId: 1 }),

      // ── favorites ──
      // Idempotent saves (one row per user+listing) + newest-saved-first lists.
      db
        .collection("favorites")
        .createIndex({ userId: 1, listingId: 1 }, { unique: true }),
      db.collection("favorites").createIndex({ userId: 1, createdAt: -1 }),

      // ── saved_searches ──
      // User's list (newest-first) + the alert job's work queue.
      db.collection("saved_searches").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("saved_searches").createIndex({ alertsEnabled: 1 }),

      // ── rate_limits ──
      // TTL: Mongo removes expired counters automatically (see lib/rate-limit.ts).
      db
        .collection("rate_limits")
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  } catch (err) {
    console.error("[db] ensureIndexes failed (continuing):", err);
  }
}
