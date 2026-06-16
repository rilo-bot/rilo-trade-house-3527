import { withErrorHandling } from "@/lib/api/handler";
import {
  handleAddFavorite,
  handleListFavorites,
} from "@/features/favorites/favorites.controller";

// GET /api/favorites — current user's saved listing ids
export const GET = withErrorHandling(handleListFavorites);

// POST /api/favorites — save a listing
export const POST = withErrorHandling(handleAddFavorite);
