import { getDb } from "@/lib/db";
import type { SubscribeAlertInput } from "./alerts.schema";

const COLLECTION = "alerts";

/**
 * Upsert an alert subscription, keyed by email + filters so re-subscribing with
 * the same criteria is idempotent (no duplicate rows). Returns whether a new
 * subscription was created (false = the same subscription already existed).
 */
export async function saveAlertSubscription(
  input: SubscribeAlertInput,
): Promise<{ created: boolean }> {
  const db = await getDb();
  const key = {
    email: input.email,
    listingType: input.listingType ?? null,
    region: input.region ?? null,
  };
  const res = await db.collection(COLLECTION).updateOne(
    key,
    { $setOnInsert: { ...key, createdAt: new Date().toISOString() } },
    { upsert: true },
  );
  return { created: res.upsertedCount > 0 };
}
