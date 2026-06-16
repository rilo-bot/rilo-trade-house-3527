import { created, ok } from "@/lib/api/response";
import { TooManyRequestsError, UnauthorizedError } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getAuctionState,
  placeBid,
  registerToBid,
  setAutoBid,
} from "./auctions.service";
import {
  autoBidSchema,
  createRegistrationSchema,
  placeBidSchema,
} from "./auctions.schema";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/auctions/registrations — register to bid (sign-in required). */
export async function handleRegisterToBid(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to register to bid");

  // Cap registrations per user to deter abuse.
  const burst = await checkRateLimit(`reg:user:${user.id}`, 10, 600); // 10 / 10 min
  if (!burst.ok) {
    throw new TooManyRequestsError(
      "Too many registration attempts. Please try again shortly.",
      { retryAfterSec: burst.retryAfterSec },
    );
  }

  const input = createRegistrationSchema.parse(await request.json());
  const registration = await registerToBid(user, input);
  return created(registration);
}

/** GET /api/listings/:id/bids — live auction snapshot (public; viewer-aware). */
export async function handleGetAuctionState(
  _request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await getCurrentUser();
  const { id } = await ctx.params;
  const state = await getAuctionState(id, user ?? null);
  return ok(state);
}

/** POST /api/listings/:id/bids — place a live bid (sign-in + registered). */
export async function handlePlaceBid(
  request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to bid");
  const { id } = await ctx.params;

  // Throttle rapid-fire bids from one user on one auction.
  const rl = await checkRateLimit(`bid:${user.id}:${id}`, 1, 2); // 1 / 2s
  if (!rl.ok) {
    throw new TooManyRequestsError("Slow down a moment, then bid again.", {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  const { amount } = placeBidSchema.parse(await request.json());
  const state = await placeBid(user, id, amount);
  return ok(state);
}

/** PUT /api/listings/:id/auto-bid — set/clear a proxy ceiling. */
export async function handleSetAutoBid(
  request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Sign in to set an auto-bid");
  const { id } = await ctx.params;

  // Setting an auto-bid can trigger real proxy bids — throttle like placing one.
  const rl = await checkRateLimit(`autobid:${user.id}:${id}`, 1, 2); // 1 / 2s
  if (!rl.ok) {
    throw new TooManyRequestsError("Slow down a moment, then try again.", {
      retryAfterSec: rl.retryAfterSec,
    });
  }

  const { maxAmount } = autoBidSchema.parse(await request.json());
  const state = await setAutoBid(user, id, maxAmount);
  return ok(state);
}
