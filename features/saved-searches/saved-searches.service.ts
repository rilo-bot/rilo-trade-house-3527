import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { sendNewMatchEmail } from "@/lib/email";
import { searchListings } from "@/features/listings/listings.repository";
import type { ListingQuery } from "@/features/listings/listings.schema";
import { formatSalePrice } from "@/features/listings/listing-labels";
import {
  countSavedSearchesByUser,
  deleteSavedSearchById,
  findAlertableSearches,
  findSavedSearchById,
  findSavedSearchesByUser,
  getUserContact,
  insertSavedSearch,
  touchLastChecked,
  updateSavedSearchById,
  type SavedSearch,
} from "./saved-searches.repository";
import {
  savedSearchFiltersSchema,
  type CreateSavedSearchInput,
  type UpdateSavedSearchInput,
} from "./saved-searches.schema";

/**
 * Business logic for saved searches. Throws AppError subclasses; the controller
 * maps them to HTTP. Ownership is enforced on every mutation.
 */

const MAX_SAVED_SEARCHES = 25;
/** How many new matches to itemise in an alert email before "+N more". */
const ALERT_PREVIEW = 6;

export async function createSavedSearch(
  user: CurrentUser,
  input: CreateSavedSearchInput,
): Promise<SavedSearch> {
  const count = await countSavedSearchesByUser(user.id);
  if (count >= MAX_SAVED_SEARCHES) {
    throw new BadRequestError(
      `You can save up to ${MAX_SAVED_SEARCHES} searches. Delete one to add another.`,
    );
  }
  // Normalise the raw query params into the canonical filter shape.
  const query = savedSearchFiltersSchema.parse(input.query);
  return insertSavedSearch({
    userId: user.id,
    name: input.name,
    query,
    alertsEnabled: input.alertsEnabled,
  });
}

export async function listSavedSearches(
  user: CurrentUser,
): Promise<SavedSearch[]> {
  return findSavedSearchesByUser(user.id);
}

async function loadOwned(user: CurrentUser, id: string) {
  const doc = await findSavedSearchById(id);
  if (!doc) throw new NotFoundError("Saved search not found");
  if (doc.userId.toString() !== user.id) {
    throw new ForbiddenError("This saved search isn't yours");
  }
  return doc;
}

export async function updateSavedSearch(
  user: CurrentUser,
  id: string,
  patch: UpdateSavedSearchInput,
): Promise<SavedSearch> {
  await loadOwned(user, id);
  const updated = await updateSavedSearchById(id, patch);
  if (!updated) throw new NotFoundError("Saved search not found");
  return updated;
}

export async function deleteSavedSearch(
  user: CurrentUser,
  id: string,
): Promise<void> {
  await loadOwned(user, id);
  await deleteSavedSearchById(id);
}

/**
 * Alert job (invoked by the cron route). For every alert-enabled saved search,
 * re-run its query, find listings created since the last check, email the owner
 * if there are any, and advance the watermark. Best-effort: a failure on one
 * search is logged and skipped so the rest still run.
 */
export async function runSavedSearchAlerts(): Promise<{
  processed: number;
  emailed: number;
  matches: number;
}> {
  const searches = await findAlertableSearches();
  let processed = 0;
  let emailed = 0;
  let matches = 0;

  for (const s of searches) {
    processed++;
    try {
      const since = s.lastCheckedAt.getTime();
      const query: ListingQuery = {
        ...s.query,
        page: 1,
        limit: 50,
        sort: "newest",
      };
      const result = await searchListings(query);
      const fresh = result.items.filter(
        (i) => new Date(i.createdAt).getTime() > since,
      );
      // Advance the watermark even with zero matches, so we never re-scan old.
      await touchLastChecked(s._id.toString(), new Date());
      if (fresh.length === 0) continue;

      const contact = await getUserContact(s.userId);
      if (!contact?.email) continue;

      const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
      const res = await sendNewMatchEmail({
        to: contact.email,
        seekerName: contact.name,
        searchName: s.name,
        manageUrl: `${base}/saved-searches`,
        listings: fresh.slice(0, ALERT_PREVIEW).map((l) => ({
          title: l.title,
          priceLabel: formatSalePrice(l.price),
          locality: l.location.locality,
          city: l.location.city,
          url: `${base}/properties/${l.id}`,
        })),
        moreCount: Math.max(0, fresh.length - ALERT_PREVIEW),
      });
      if (res.success) {
        emailed++;
        matches += fresh.length;
      }
    } catch (err) {
      console.error(`[alerts] saved search ${s._id} failed:`, err);
    }
  }

  return { processed, emailed, matches };
}
