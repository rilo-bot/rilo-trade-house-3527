import { withErrorHandling } from "@/lib/api/handler";
import { handleSubscribeAlerts } from "@/features/alerts/alerts.controller";

// POST /api/alerts — subscribe an email to new-listing alerts.
export const POST = withErrorHandling(handleSubscribeAlerts);
