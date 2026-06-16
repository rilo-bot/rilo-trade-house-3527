import { getDb } from "@/lib/db";
import { UserRole } from "@/lib/enums";
import {
  countListingsByStatus,
  findRecentListings,
  type Listing,
} from "@/features/listings/listings.repository";
import { countAllLeads } from "@/features/leads/leads.repository";
import { countAllFavorites } from "@/features/favorites/favorites.repository";

/**
 * Read-only platform analytics for the admin overview. Aggregates counts across
 * the user / listings / leads / favorites collections. No mutations here —
 * moderation actions (approve/reject, suspend) arrive in a later phase.
 */

export interface PlatformStats {
  users: { total: number; byRole: Record<string, number> };
  listings: { total: number; byStatus: Record<string, number> };
  leads: number;
  saves: number;
}

/** Users grouped by role. A missing/null role is bucketed as a seeker (the
 *  default), matching how the app treats role-less accounts. */
async function countUsersByRole(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .collection("user")
    .aggregate<{ _id: string | null; count: number }>([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ])
    .toArray();
  const out: Record<string, number> = {};
  for (const r of rows) {
    const key = r._id ?? UserRole.Seeker;
    out[key] = (out[key] ?? 0) + r.count;
  }
  return out;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const [byRole, byStatus, leads, saves] = await Promise.all([
    countUsersByRole(),
    countListingsByStatus(),
    countAllLeads(),
    countAllFavorites(),
  ]);
  const sum = (m: Record<string, number>) =>
    Object.values(m).reduce((a, b) => a + b, 0);
  return {
    users: { total: sum(byRole), byRole },
    listings: { total: sum(byStatus), byStatus },
    leads,
    saves,
  };
}

/** Newest listings across the whole platform (admin activity feed). */
export async function getRecentListings(limit = 5): Promise<Listing[]> {
  return findRecentListings(limit);
}
