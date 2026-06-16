import { withErrorHandling } from "@/lib/api/handler";
import { handleSetAutoBid } from "@/features/auctions/auctions.controller";

// PUT /api/listings/:id/auto-bid — set ({maxAmount}) or clear ({maxAmount:null})
// the viewer's proxy bid ceiling.
export const PUT = withErrorHandling(handleSetAutoBid);
