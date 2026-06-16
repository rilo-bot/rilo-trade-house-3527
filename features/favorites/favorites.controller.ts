import { created, noContent, ok } from "@/lib/api/response";
import { UnauthorizedError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth/guards";
import { addFavoriteSchema } from "./favorites.schema";
import {
  listFavoriteIds,
  listFavoriteListings,
  saveFavorite,
  unsaveFavorite,
} from "./favorites.service";

type RouteContext = { params: Promise<{ listingId: string }> };

/** GET /api/favorites — the current user's saved listing ids (empty for guests). */
export async function handleListFavorites(): Promise<Response> {
  const user = await getCurrentUser();
  const listingIds = user ? await listFavoriteIds(user) : [];
  return ok({ listingIds });
}

/** GET /api/favorites/listings — the current user's saved listings (auth required). */
export async function handleListFavoriteListings(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to view your wishlist");
  const listings = await listFavoriteListings(user);
  return ok({ listings });
}

/** POST /api/favorites — save a listing (auth required). */
export async function handleAddFavorite(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to save properties");
  const { listingId } = addFavoriteSchema.parse(await request.json());
  await saveFavorite(user, listingId);
  return created({ listingId });
}

/** DELETE /api/favorites/:listingId — remove a saved listing (auth required). */
export async function handleRemoveFavorite(
  _request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to manage your wishlist");
  const { listingId } = await ctx.params;
  await unsaveFavorite(user, listingId);
  return noContent();
}
