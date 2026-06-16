import { created, fail, noContent, ok } from "@/lib/api/response";
import { UnauthorizedError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  runSavedSearchAlerts,
  updateSavedSearch,
} from "./saved-searches.service";
import {
  createSavedSearchSchema,
  updateSavedSearchSchema,
} from "./saved-searches.schema";

type RouteContext = { params: Promise<{ id: string }> };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to manage saved searches");
  return user;
}

/** GET /api/saved-searches — the current user's saved searches. */
export async function handleListSavedSearches(): Promise<Response> {
  const user = await requireUser();
  const savedSearches = await listSavedSearches(user);
  return ok({ savedSearches });
}

/** POST /api/saved-searches — save the current search. */
export async function handleCreateSavedSearch(
  request: Request,
): Promise<Response> {
  const user = await requireUser();
  const input = createSavedSearchSchema.parse(await request.json());
  const savedSearch = await createSavedSearch(user, input);
  return created({ savedSearch });
}

/** PATCH /api/saved-searches/:id — rename or toggle alerts. */
export async function handleUpdateSavedSearch(
  request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await requireUser();
  const { id } = await ctx.params;
  const patch = updateSavedSearchSchema.parse(await request.json());
  const savedSearch = await updateSavedSearch(user, id, patch);
  return ok({ savedSearch });
}

/** DELETE /api/saved-searches/:id — remove a saved search. */
export async function handleDeleteSavedSearch(
  _request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await requireUser();
  const { id } = await ctx.params;
  await deleteSavedSearch(user, id);
  return noContent();
}

/**
 * GET /api/cron/alerts — run the saved-search alert job. Protected by a shared
 * secret in the `x-cron-secret` header (set CRON_SECRET); disabled (503) when
 * the secret isn't configured, so it's never an open endpoint.
 */
export async function handleRunAlerts(request: Request): Promise<Response> {
  if (!env.CRON_SECRET) {
    return fail(
      { code: "CRON_DISABLED", message: "Alerts cron is not configured" },
      503,
    );
  }
  if (request.headers.get("x-cron-secret") !== env.CRON_SECRET) {
    throw new UnauthorizedError("Invalid cron secret");
  }
  const summary = await runSavedSearchAlerts();
  return ok(summary);
}
