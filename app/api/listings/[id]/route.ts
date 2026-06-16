import { withErrorHandling } from "@/lib/api/handler";
import {
  handleDeleteListing,
  handleGetListing,
  handleUpdateListing,
} from "@/features/listings/listings.controller";

// GET (detail) | PATCH (edit) | DELETE — /api/listings/:id
export const GET = withErrorHandling(handleGetListing);
export const PATCH = withErrorHandling(handleUpdateListing);
export const DELETE = withErrorHandling(handleDeleteListing);
