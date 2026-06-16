import { ListingStatus, UserRole } from "@/lib/enums";
import { can } from "@/lib/auth-permissions";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/guards";
import {
  countActiveByCity,
  countActiveByOwner,
  countActiveByPropertyType,
  countActiveByType,
  deleteListingById,
  distinctActiveCities,
  findListingById,
  findListingsByOwner,
  findListingSummariesByIds,
  insertListing,
  searchListings,
  searchListingsByOwner,
  toPublicListing,
  updateListingById,
  type Listing,
  type ListingSummary,
  type SearchResult,
} from "./listings.repository";
import {
  countFavorites,
  filterFavoritedIds,
} from "@/features/favorites/favorites.repository";
import type {
  CreateListingInput,
  ListingQuery,
  MyListingsQuery,
  UpdateListingInput,
} from "./listings.schema";

/**
 * Business logic for listings. Throws AppError subclasses; the controller maps
 * them to HTTP. No request/response objects here.
 */

/** Max simultaneously-active listings per role (Infinity = unlimited). */
const ACTIVE_LISTING_LIMIT: Record<UserRole, number> = {
  [UserRole.Seeker]: 0,
  [UserRole.Owner]: 3,
  [UserRole.Agent]: 50,
  [UserRole.Admin]: Infinity,
};

/** Per-user active-listing overrides (by email, lower-cased) — beats the role
 *  default. For demo/partner accounts that need a higher cap. */
const ACTIVE_LISTING_OVERRIDES: Record<string, number> = {
  "mahimalik7043@gmail.com": 100,
};

/** The active-listing cap for a user: a per-user override if set, else the
 *  per-role default (Infinity = unlimited). */
export function activeListingLimitFor(user: CurrentUser): number {
  return (
    ACTIVE_LISTING_OVERRIDES[user.email.toLowerCase()] ??
    ACTIVE_LISTING_LIMIT[user.role]
  );
}

function assertCanModify(user: CurrentUser, listing: Listing): void {
  const isOwner = listing.ownerId === user.id;
  if (!isOwner && user.role !== UserRole.Admin) {
    throw new ForbiddenError("You can only manage your own listings");
  }
}

export async function createListing(
  user: CurrentUser,
  input: CreateListingInput,
): Promise<Listing> {
  if (!can(user.role, "property:create")) {
    throw new ForbiddenError("Your account can't post properties");
  }

  // Enforce the per-role active-listing limit (drafts don't count).
  if (input.status === ListingStatus.Active) {
    const activeCount = await countActiveByOwner(user.id);
    const limit = activeListingLimitFor(user);
    if (activeCount >= limit) {
      throw new BadRequestError(
        `You've reached your active listing limit (${limit}). Mark one sold/rented or upgrade.`,
      );
    }
  }

  const { status, ...rest } = input;
  return insertListing({ ...rest, ownerId: user.id, status });
}

/**
 * Public detail view — only ACTIVE listings. When a `user` is supplied, the
 * result carries `isFavorite` so the page needs no separate favorites call.
 */
export async function getPublicListing(
  id: string,
  user?: CurrentUser,
): Promise<Listing> {
  const listing = await findListingById(id);
  if (!listing || listing.status !== ListingStatus.Active) {
    throw new NotFoundError("Listing not found");
  }
  const isFavorite = user
    ? (await filterFavoritedIds(user.id, [listing.id])).length > 0
    : undefined;
  // Strip the secret reserve before it leaves for a public client.
  return { ...toPublicListing(listing), isFavorite };
}

/** Owner/admin view — any status, but ownership-gated. */
export async function getOwnedListing(
  user: CurrentUser,
  id: string,
): Promise<Listing> {
  const listing = await findListingById(id);
  if (!listing) throw new NotFoundError("Listing not found");
  assertCanModify(user, listing);
  return listing;
}

export async function listMyListings(user: CurrentUser): Promise<Listing[]> {
  return findListingsByOwner(user.id);
}

/** Cover image + current status for a set of listing ids (any status). Powers
 *  the seeker's enquiries list — thumbnails + "no longer available" handling. */
export async function getListingSummaries(
  ids: string[],
): Promise<Record<string, ListingSummary>> {
  return findListingSummariesByIds(ids);
}

/** How many of the owner's listings count against their active-slot limit. */
export async function countMyActiveListings(user: CurrentUser): Promise<number> {
  return countActiveByOwner(user.id);
}

/** Paginated owner listings with search + status/type filters. */
export async function searchMyListings(
  user: CurrentUser,
  query: MyListingsQuery,
): Promise<SearchResult> {
  return searchListingsByOwner(user.id, query);
}

/**
 * Public search. When a `user` is supplied, each item is decorated with
 * `isFavorite` and the result carries the user's total `favoritesCount` — so a
 * single `/api/listings` call gives both the listings and their wishlist state.
 */
export async function searchPublicListings(
  query: ListingQuery,
  user?: CurrentUser,
): Promise<SearchResult> {
  const result = await searchListings(query);
  // Strip the secret reserve from every public result.
  const items = result.items.map(toPublicListing);
  if (!user) return { ...result, items };

  const [favoritedIds, favoritesCount] = await Promise.all([
    filterFavoritedIds(
      user.id,
      items.map((i) => i.id),
    ),
    countFavorites(user.id),
  ]);
  const favSet = new Set(favoritedIds);
  return {
    ...result,
    items: items.map((i) => ({ ...i, isFavorite: favSet.has(i.id) })),
    favoritesCount,
  };
}

/** Cities with active listings — powers the city multi-select filter. */
export async function listSearchCities(): Promise<string[]> {
  return distinctActiveCities();
}

/** Real active-listing counts per city — powers the home "top cities" tiles. */
export async function getCityListingCounts(): Promise<Record<string, number>> {
  return countActiveByCity();
}

/** Active-listing counts per listing type — powers the home action tiles. */
export async function getListingTypeCounts(): Promise<Record<string, number>> {
  return countActiveByType();
}

/** Active-listing counts per property type — powers the "browse by type" tiles. */
export async function getPropertyTypeCounts(): Promise<Record<string, number>> {
  return countActiveByPropertyType();
}

export async function updateListing(
  user: CurrentUser,
  id: string,
  patch: UpdateListingInput,
): Promise<Listing> {
  const existing = await findListingById(id);
  if (!existing) throw new NotFoundError("Listing not found");
  assertCanModify(user, existing);

  // Re-check the limit when re-activating a draft.
  if (
    patch.status === ListingStatus.Active &&
    existing.status !== ListingStatus.Active
  ) {
    const activeCount = await countActiveByOwner(user.id);
    if (activeCount >= activeListingLimitFor(user)) {
      throw new BadRequestError("You've reached your active listing limit");
    }
  }

  const updated = await updateListingById(id, patch);
  if (!updated) throw new NotFoundError("Listing not found");
  return updated;
}

export async function deleteListing(
  user: CurrentUser,
  id: string,
): Promise<void> {
  const existing = await findListingById(id);
  if (!existing) throw new NotFoundError("Listing not found");
  assertCanModify(user, existing);
  await deleteListingById(id);
}
