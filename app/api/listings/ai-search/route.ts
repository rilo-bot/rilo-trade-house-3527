import { withErrorHandling } from "@/lib/api/handler";
import { handleAiSearch } from "@/features/listings/ai-search.controller";

// Calls the model + resolves filters server-side; runs on the Node runtime.
export const maxDuration = 30;

// POST /api/listings/ai-search — natural-language → structured search filters.
export const POST = withErrorHandling(handleAiSearch);
