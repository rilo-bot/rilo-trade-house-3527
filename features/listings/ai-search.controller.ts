import { isAiConfigured } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  BadRequestError,
  ServiceUnavailableError,
  TooManyRequestsError,
} from "@/lib/errors";
import { ok } from "@/lib/api/response";
import { parseSearchQuery } from "./ai-search.service";
import { aiSearchRequestSchema } from "./ai-search.schema";

/**
 * HTTP boundary for AI advanced search: validate + throttle, run the parse, and
 * return the resolved filters in the standard envelope. Errors thrown here are
 * formatted by `withErrorHandling`.
 */
export async function handleAiSearch(request: Request): Promise<Response> {
  if (!isAiConfigured()) {
    throw new ServiceUnavailableError("AI search isn't available right now.");
  }

  // Identify + throttle, reusing the same Mongo limiter as the assistant. Each
  // parse is one model call, so guests get a tighter budget than members.
  const user = await getCurrentUser();
  const key = user
    ? `ai-search:user:${user.id}`
    : `ai-search:ip:${getClientIp(request)}`;
  const limit = user ? 30 : 10;
  const { ok: allowed, retryAfterSec } = await checkRateLimit(key, limit, 300); // per 5 min
  if (!allowed) {
    throw new TooManyRequestsError(
      "You're searching too quickly. Please wait a moment.",
      { retryAfterSec },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Invalid request body");
  }

  const { query, listingType } = aiSearchRequestSchema.parse(body);
  const result = await parseSearchQuery(query, listingType);
  return ok(result);
}
