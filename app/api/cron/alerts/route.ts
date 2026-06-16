import { withErrorHandling } from "@/lib/api/handler";
import { handleRunAlerts } from "@/features/saved-searches/saved-searches.controller";

// GET /api/cron/alerts — run saved-search new-match alerts (shared-secret gated).
// Trigger from an external scheduler (Vercel Cron / system cron / the /schedule
// skill) with header: x-cron-secret: <CRON_SECRET>
export const GET = withErrorHandling(handleRunAlerts);
