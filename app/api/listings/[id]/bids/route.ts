import { withErrorHandling } from "@/lib/api/handler";
import {
  handleGetAuctionState,
  handlePlaceBid,
} from "@/features/auctions/auctions.controller";

// GET  /api/listings/:id/bids — live auction snapshot (current bid, history, …)
// POST /api/listings/:id/bids — place a bid (sign-in + registered, live only)
export const GET = withErrorHandling(handleGetAuctionState);
export const POST = withErrorHandling(handlePlaceBid);
