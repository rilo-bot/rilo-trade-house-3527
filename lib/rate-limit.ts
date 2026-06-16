import { Collection } from "mongodb";
import { getDb } from "@/lib/db";

/**
 * Lightweight, Mongo-backed fixed-window rate limiter. Each (key, window) pair
 * is one counter document whose `_id` embeds the window start, so a new window
 * begins with a fresh counter and old counters are reaped by the TTL index on
 * `expiresAt` (created in lib/db-indexes.ts). Using Mongo — rather than an
 * in-memory Map — means the limit holds across multiple server instances.
 */
interface RateLimitDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}

export interface RateLimitResult {
  /** False once the window's count exceeds `limit`. */
  ok: boolean;
  /** Seconds until the current window resets. */
  retryAfterSec: number;
}

async function collection(): Promise<Collection<RateLimitDoc>> {
  const db = await getDb();
  return db.collection<RateLimitDoc>("rate_limits");
}

/**
 * Records a hit against `key` and reports whether it's still within `limit`
 * hits per `windowSec`. Atomic ($inc on upsert), so concurrent calls count
 * correctly.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const col = await collection();
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const id = `${key}:${windowStart}`;
  const expiresAt = new Date(windowStart + windowMs);

  const doc = await col.findOneAndUpdate(
    { _id: id },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, returnDocument: "after" },
  );

  const count = doc?.count ?? 1;
  return {
    ok: count <= limit,
    retryAfterSec: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
  };
}

/**
 * Best-effort client IP from proxy headers (falls back to a shared bucket).
 *
 * DEPLOYMENT ASSUMPTION: the leftmost `x-forwarded-for` hop is client-supplied
 * and therefore spoofable unless a trusted reverse proxy (Vercel, nginx, a load
 * balancer) overwrites/strips it. Run this app behind such a proxy so per-IP
 * limits hold; if you front it differently, read the platform's trusted IP
 * header (e.g. the rightmost trusted hop) instead. Signed-in limits key on the
 * session user id, which is not spoofable.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
