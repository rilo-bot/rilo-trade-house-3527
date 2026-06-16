import { withErrorHandling } from "@/lib/api/handler";
import { handleRegisterToBid } from "@/features/auctions/auctions.controller";

// POST /api/auctions/registrations — register to bid on an auction listing.
export const POST = withErrorHandling(handleRegisterToBid);
