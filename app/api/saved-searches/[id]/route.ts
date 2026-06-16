import { withErrorHandling } from "@/lib/api/handler";
import {
  handleDeleteSavedSearch,
  handleUpdateSavedSearch,
} from "@/features/saved-searches/saved-searches.controller";

// PATCH /api/saved-searches/:id — rename or toggle alerts
export const PATCH = withErrorHandling(handleUpdateSavedSearch);

// DELETE /api/saved-searches/:id — remove a saved search
export const DELETE = withErrorHandling(handleDeleteSavedSearch);
