import { withErrorHandling } from "@/lib/api/handler";
import { handleListFavoriteListings } from "@/features/favorites/favorites.controller";

// GET /api/favorites/listings — current user's saved listings (full cards)
export const GET = withErrorHandling(handleListFavoriteListings);
