import { withErrorHandling } from "@/lib/api/handler";
import { handleGetHealth } from "@/features/health/health.controller";

/**
 * HTTP boundary — keep this file thin.
 *
 * `route.ts` only maps HTTP methods to controllers and applies cross-cutting
 * wrappers (error handling, and later auth/rate-limiting). No business logic
 * lives here. GET /api/health
 */
export const GET = withErrorHandling(handleGetHealth);
