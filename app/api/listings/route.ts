import { withErrorHandling } from "@/lib/api/handler";
import {
  handleCreateListing,
  handleSearchListings,
} from "@/features/listings/listings.controller";

// GET /api/listings  — public search   |   POST /api/listings — create
export const GET = withErrorHandling(handleSearchListings);
export const POST = withErrorHandling(handleCreateListing);
