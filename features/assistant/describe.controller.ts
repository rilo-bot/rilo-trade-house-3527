import { isAiConfigured } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth-permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { ok } from "@/lib/api/response";
import {
  BadRequestError,
  ForbiddenError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
} from "@/lib/errors";
import { describeRequestSchema } from "./describe.schema";
import { generateListingDescription } from "./describe.service";

/**
 * HTTP boundary for the AI listing-description writer. Only signed-in users who
 * can manage their own listings may use it (owners/agents/admins). Generation
 * is costlier than a normal chat turn, so it gets a tighter per-user limit.
 */
export async function handleDescribeListing(
  request: Request,
): Promise<Response> {
  if (!isAiConfigured()) {
    throw new ServiceUnavailableError(
      "The AI writer isn't available right now.",
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError("Please sign in to use the AI writer.");
  }
  if (!can(user.role, "property:manage-own")) {
    throw new ForbiddenError(
      "Only owner or agent accounts can post listings.",
    );
  }

  const { ok: allowed, retryAfterSec } = await checkRateLimit(
    `assistant:describe:${user.id}`,
    20,
    300, // 20 generations / 5 min
  );
  if (!allowed) {
    throw new TooManyRequestsError(
      "You're generating descriptions too quickly. Please wait a moment.",
      { retryAfterSec },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Invalid request body");
  }

  const input = describeRequestSchema.parse(body);
  const description = await generateListingDescription(input);
  return ok({ description });
}
