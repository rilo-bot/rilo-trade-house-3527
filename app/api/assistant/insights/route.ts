import { withErrorHandling } from "@/lib/api/handler";
import { handlePageInsight } from "@/features/assistant/insights.controller";

// Talks to OpenRouter for listing pages; runs on the Node runtime (default).
export const maxDuration = 30;

// POST /api/assistant/insights — one short, spoken-style line about the page
// the visitor is on, for the floating guide character.
export const POST = withErrorHandling(handlePageInsight);
