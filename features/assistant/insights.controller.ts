import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { ok } from "@/lib/api/response";
import { BadRequestError, TooManyRequestsError } from "@/lib/errors";
import { generatePageInsight } from "./insights.service";
import { insightRequestSchema } from "./insights.schema";

/**
 * HTTP boundary for the guide character's page insight. Validates + throttles,
 * resolves the viewer (so private/owned listings stay correct), and returns the
 * spoken line in the standard envelope.
 *
 * This is intentionally cheap and non-streaming — one short line per page — so
 * it can be played through TTS without the chat pipeline's overhead. It never
 * 503s on missing AI: the service degrades to a deterministic template.
 */
export async function handlePageInsight(request: Request): Promise<Response> {
  const user = await getCurrentUser();

  // Light throttle so navigation can't spam the model. Generous — the client
  // only calls this on listing pages and caches per listing.
  const key = user
    ? `insights:user:${user.id}`
    : `insights:ip:${getClientIp(request)}`;
  const { ok: allowed, retryAfterSec } = await checkRateLimit(key, 60, 300);
  if (!allowed) {
    throw new TooManyRequestsError(
      "Too many requests. Please wait a moment.",
      { retryAfterSec },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Invalid request body");
  }

  const input = insightRequestSchema.parse(body);
  const insight = await generatePageInsight(input, user);
  return ok(insight);
}
