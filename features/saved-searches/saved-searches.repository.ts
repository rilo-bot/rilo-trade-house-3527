import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import type { SavedSearchFilters } from "./saved-searches.schema";

/**
 * Data access for saved searches. One document per saved query; the alert job
 * reads `alertsEnabled` rows and uses `lastCheckedAt` as the "new listings
 * since" watermark. No HTTP, no business rules — see saved-searches.service.ts.
 */
export interface SavedSearchDoc {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  query: SavedSearchFilters;
  alertsEnabled: boolean;
  /** Only listings created AFTER this can trigger an alert. */
  lastCheckedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** API-facing shape (ids as strings, dates as ISO). */
export type SavedSearch = Omit<
  SavedSearchDoc,
  "_id" | "userId" | "lastCheckedAt" | "createdAt" | "updatedAt"
> & {
  id: string;
  userId: string;
  lastCheckedAt: string;
  createdAt: string;
  updatedAt: string;
};

async function collection(): Promise<Collection<SavedSearchDoc>> {
  const db = await getDb();
  return db.collection<SavedSearchDoc>("saved_searches");
}

function toSavedSearch(doc: SavedSearchDoc): SavedSearch {
  const { _id, userId, lastCheckedAt, createdAt, updatedAt, ...rest } = doc;
  return {
    ...rest,
    id: _id.toString(),
    userId: userId.toString(),
    lastCheckedAt: lastCheckedAt.toISOString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export async function insertSavedSearch(input: {
  userId: string;
  name: string;
  query: SavedSearchFilters;
  alertsEnabled: boolean;
}): Promise<SavedSearch> {
  const col = await collection();
  const now = new Date();
  const doc: SavedSearchDoc = {
    _id: new ObjectId(),
    userId: new ObjectId(input.userId),
    name: input.name,
    query: input.query,
    alertsEnabled: input.alertsEnabled,
    lastCheckedAt: now, // alerts only fire for listings created after saving
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return toSavedSearch(doc);
}

export async function findSavedSearchesByUser(
  userId: string,
): Promise<SavedSearch[]> {
  const col = await collection();
  const docs = await col
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toSavedSearch);
}

export async function findSavedSearchById(
  id: string,
): Promise<SavedSearchDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function countSavedSearchesByUser(userId: string): Promise<number> {
  const col = await collection();
  return col.countDocuments({ userId: new ObjectId(userId) });
}

export async function updateSavedSearchById(
  id: string,
  patch: { name?: string; alertsEnabled?: boolean },
): Promise<SavedSearch | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return doc ? toSavedSearch(doc) : null;
}

export async function deleteSavedSearchById(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await collection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

/** All alert-enabled searches — the alert job's work queue. */
export async function findAlertableSearches(): Promise<SavedSearchDoc[]> {
  const col = await collection();
  return col.find({ alertsEnabled: true }).toArray();
}

/** Advance the "new since" watermark after an alert run. */
export async function touchLastChecked(id: string, when: Date): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const col = await collection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { lastCheckedAt: when } });
}

/** Email + name for the saved search's owner, for alert emails. */
export async function getUserContact(
  userId: ObjectId,
): Promise<{ email: string; name: string } | null> {
  const db = await getDb();
  const user = await db
    .collection("user")
    .findOne({ _id: userId }, { projection: { email: 1, name: 1 } });
  if (!user?.email) return null;
  return { email: user.email as string, name: (user.name as string) ?? "" };
}
