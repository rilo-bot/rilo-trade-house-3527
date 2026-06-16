import { ObjectId } from "mongodb";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/auth/guards";
import {
  findActiveListingsByIds,
  findListingById,
  type Listing,
} from "@/features/listings/listings.repository";
import {
  addFavorite as addFavoriteDoc,
  findFavoriteListingIds,
  removeFavorite as removeFavoriteDoc,
} from "./favorites.repository";

/**
 * Business logic for the wishlist. Throws AppError subclasses; the controller
 * maps them to HTTP. Saving requires the listing to actually exist and be
 * publicly visible (active).
 */

export async function saveFavorite(
  user: CurrentUser,
  listingId: string,
): Promise<void> {
  if (!ObjectId.isValid(listingId)) {
    throw new BadRequestError("Invalid listing id");
  }
  const listing = await findListingById(listingId);
  if (!listing) throw new NotFoundError("Listing not found");
  await addFavoriteDoc(user.id, listingId);
}

export async function unsaveFavorite(
  user: CurrentUser,
  listingId: string,
): Promise<void> {
  if (!ObjectId.isValid(listingId)) {
    throw new BadRequestError("Invalid listing id");
  }
  await removeFavoriteDoc(user.id, listingId);
}

/** The listing ids the user has saved (newest first) — hydrates the heart UI. */
export async function listFavoriteIds(user: CurrentUser): Promise<string[]> {
  return findFavoriteListingIds(user.id);
}

/** The user's saved listings as full cards, newest-saved first. */
export async function listFavoriteListings(
  user: CurrentUser,
): Promise<Listing[]> {
  const ids = await findFavoriteListingIds(user.id);
  return findActiveListingsByIds(ids);
}
