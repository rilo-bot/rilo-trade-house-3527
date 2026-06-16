import { created, ok } from "@/lib/api/response";
import { TooManyRequestsError, UnauthorizedError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { changeLeadStatus, createLead } from "./leads.service";
import { createLeadSchema, updateLeadStatusSchema } from "./leads.schema";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/leads — create an enquiry (guests allowed). */
export async function handleCreateLead(request: Request): Promise<Response> {
  // The endpoint is public, so guard it against spam/abuse before doing any
  // work: cap total enquiries per IP, then block rapid duplicates per listing.
  const ip = getClientIp(request);
  const burst = await checkRateLimit(`lead:ip:${ip}`, 5, 600); // 5 / 10 min
  if (!burst.ok) {
    throw new TooManyRequestsError(
      "Too many enquiries from this network. Please try again shortly.",
      { retryAfterSec: burst.retryAfterSec },
    );
  }

  const input = createLeadSchema.parse(await request.json());

  const dup = await checkRateLimit(`lead:dup:${ip}:${input.listingId}`, 1, 300); // 1 / 5 min
  if (!dup.ok) {
    throw new TooManyRequestsError(
      "You've already sent an enquiry for this listing — please wait before sending another.",
      { retryAfterSec: dup.retryAfterSec },
    );
  }

  const seeker = await getCurrentUser(); // null for guests
  const lead = await createLead(input, seeker);
  return created(lead);
}

/** PATCH /api/leads/:id — owner/admin updates a lead's status. */
export async function handleUpdateLeadStatus(
  request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to continue");
  const { id } = await ctx.params;
  const { status } = updateLeadStatusSchema.parse(await request.json());
  const lead = await changeLeadStatus(user, id, status);
  return ok(lead);
}
