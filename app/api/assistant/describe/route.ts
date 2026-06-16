import { withErrorHandling } from "@/lib/api/handler";
import { handleDescribeListing } from "@/features/assistant/describe.controller";

// Calls the model once (non-streaming) to draft a listing description.
export const maxDuration = 30;

// POST /api/assistant/describe — AI listing-description writer (owners/agents).
export const POST = withErrorHandling(handleDescribeListing);
