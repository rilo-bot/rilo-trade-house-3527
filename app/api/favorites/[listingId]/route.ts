import { withErrorHandling } from "@/lib/api/handler";
import { handleRemoveFavorite } from "@/features/favorites/favorites.controller";

// DELETE /api/favorites/:listingId — remove a saved listing
export const DELETE = withErrorHandling(handleRemoveFavorite);
