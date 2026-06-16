import { withErrorHandling } from "@/lib/api/handler";
import {
  handleCreateSavedSearch,
  handleListSavedSearches,
} from "@/features/saved-searches/saved-searches.controller";

// GET /api/saved-searches — current user's saved searches
export const GET = withErrorHandling(handleListSavedSearches);

// POST /api/saved-searches — save the current search
export const POST = withErrorHandling(handleCreateSavedSearch);
