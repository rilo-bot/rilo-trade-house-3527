import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { ListingStatus } from "@/lib/enums";

/**
 * Data access for favorites (wishlist). One document per (user, listing) save —
 * the same one-row-per-relation style as `leads`. A unique compound index makes
 * saves idempotent and lets us list a user's wishlist newest-first cheaply.
 */
export interface FavoriteDoc {
  _id: ObjectId;
  userId: ObjectId;
  listingId: ObjectId;
  createdAt: Date;
}

async function collection(): Promise<Collection<FavoriteDoc>> {
  const db = await getDb();
  // The unique (userId, listingId) index — which makes saves idempotent — is
  // created centrally in lib/db-indexes.ts (ensureIndexes), not per call.
  return db.collection<FavoriteDoc>("favorites");
}

/** Save a listing for a user. Idempotent — re-saving is a no-op. */
export async function addFavorite(
  userId: string,
  listingId: string,
): Promise<void> {
  const col = await collection();
  await col.updateOne(
    { userId: new ObjectId(userId), listingId: new ObjectId(listingId) },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
}

/** Remove a saved listing for a user. */
export async function removeFavorite(
  userId: string,
  listingId: string,
): Promise<void> {
  const col = await collection();
  await col.deleteOne({
    userId: new ObjectId(userId),
    listingId: new ObjectId(listingId),
  });
}

/** Of the given listing ids, which the user has saved (for `isFavorite` flags). */
export async function filterFavoritedIds(
  userId: string,
  listingIds: string[],
): Promise<string[]> {
  const valid = listingIds.filter((id) => ObjectId.isValid(id));
  if (valid.length === 0) return [];
  const col = await collection();
  const docs = await col
    .find(
      {
        userId: new ObjectId(userId),
        listingId: { $in: valid.map((id) => new ObjectId(id)) },
      },
      { projection: { listingId: 1 } },
    )
    .toArray();
  return docs.map((d) => d.listingId.toString());
}

/**
 * Number of saved listings a user has that are still ACTIVE — i.e. the count of
 * cards the wishlist page actually renders (it shows active listings only). A
 * plain document count would include saves whose listing was since deleted or
 * deactivated, making the navbar badge disagree with the wishlist page.
 */
export async function countFavorites(userId: string): Promise<number> {
  const col = await collection();
  const rows = await col
    .aggregate<{ n: number }>([
      { $match: { userId: new ObjectId(userId) } },
      {
        $lookup: {
          from: "listings",
          localField: "listingId",
          foreignField: "_id",
          as: "listing",
        },
      },
      { $unwind: "$listing" },
      { $match: { "listing.status": ListingStatus.Active } },
      { $count: "n" },
    ])
    .toArray();
  return rows[0]?.n ?? 0;
}

/**
 * Map of listingId → number of users who have saved it, for the given listing
 * ids. Powers the owner dashboard's per-listing "saves" count (same shape as
 * `countLeadsByListings`). Counts every save regardless of listing status.
 */
export async function countFavoritesByListings(
  listingIds: string[],
): Promise<Record<string, number>> {
  if (listingIds.length === 0) return {};
  const col = await collection();
  const objIds = listingIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  if (objIds.length === 0) return {};
  const rows = await col
    .aggregate<{ _id: ObjectId; count: number }>([
      { $match: { listingId: { $in: objIds } } },
      { $group: { _id: "$listingId", count: { $sum: 1 } } },
    ])
    .toArray();
  const result: Record<string, number> = {};
  for (const r of rows) result[r._id.toString()] = r.count;
  return result;
}

/** Total number of saves platform-wide (admin overview). */
export async function countAllFavorites(): Promise<number> {
  const col = await collection();
  return col.countDocuments({});
}

/** All listing ids a user has saved, newest-saved first. */
export async function findFavoriteListingIds(userId: string): Promise<string[]> {
  const col = await collection();
  const docs = await col
    .find({ userId: new ObjectId(userId) }, { projection: { listingId: 1 } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((d) => d.listingId.toString());
}
