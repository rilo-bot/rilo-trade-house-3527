import { created, noContent, ok } from "@/lib/api/response";
import { UnauthorizedError } from "@/lib/errors";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/guards";
import { countLeadsByListings } from "@/features/leads/leads.repository";
import { countFavoritesByListings } from "@/features/favorites/favorites.repository";
import {
  createListing,
  deleteListing,
  getPublicListing,
  searchMyListings,
  searchPublicListings,
  updateListing,
} from "./listings.service";
import {
  createListingSchema,
  listingQuerySchema,
  myListingsQuerySchema,
  updateListingSchema,
} from "./listings.schema";

/**
 * Controller layer for listings: read/validate input → call service → envelope.
 * No business logic. Auth is enforced here by throwing UnauthorizedError when
 * a mutation lacks a session (route handlers can't use redirect()).
 */

type RouteContext = { params: Promise<{ id: string }> };

async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to continue");
  return user;
}

/**
 * GET /api/listings — public search (decorated with the viewer's favorites).
 *
 * `?scope=mine` switches to the signed-in owner/agent's own listings (plus a
 * lead-count map) instead of the public catalogue — same collection, filtered
 * to the current user. Lets the "Your properties" manager fetch fresh data on
 * the client (a visible API call on every visit), like the public browser does.
 */
export async function handleSearchListings(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("scope") === "mine") {
    return listMine(url.searchParams);
  }

  const user = await getCurrentUser();
  const params = Object.fromEntries(url.searchParams);
  const query = listingQuerySchema.parse(params);
  const result = await searchPublicListings(query, user ?? undefined);
  return ok(result);
}

/**
 * The `?scope=mine` branch of GET /api/listings — paginated owner listings with
 * `q`/`status`/`listingType` filters, plus a lead-count map for the page's
 * items. Returns the same pagination meta as public search (page/total/…) so
 * the manager can search + infinite-scroll.
 */
async function listMine(searchParams: URLSearchParams): Promise<Response> {
  const user = await requireApiUser();
  const query = myListingsQuerySchema.parse(Object.fromEntries(searchParams));
  const result = await searchMyListings(user, query);
  const ids = result.items.map((l) => l.id);
  const [leadCounts, saveCounts] =
    ids.length > 0
      ? await Promise.all([
          countLeadsByListings(ids),
          countFavoritesByListings(ids),
        ])
      : [{}, {}];
  return ok({ ...result, listings: result.items, leadCounts, saveCounts });
}

/** POST /api/listings — create a listing (owner/agent/admin). */
export async function handleCreateListing(request: Request): Promise<Response> {
  const user = await requireApiUser();
  const body = await request.json();
  const input = createListingSchema.parse(body);
  const listing = await createListing(user, input);
  return created(listing);
}

/** GET /api/listings/:id — public detail (active only). */
export async function handleGetListing(
  _request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await getCurrentUser();
  const { id } = await ctx.params;
  const listing = await getPublicListing(id, user ?? undefined);
  return ok(listing);
}

/** PATCH /api/listings/:id — owner/admin edit. */
export async function handleUpdateListing(
  request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  const patch = updateListingSchema.parse(await request.json());
  const listing = await updateListing(user, id, patch);
  return ok(listing);
}

/** DELETE /api/listings/:id — owner/admin delete. */
export async function handleDeleteListing(
  _request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await requireApiUser();
  const { id } = await ctx.params;
  await deleteListing(user, id);
  return noContent();
}
