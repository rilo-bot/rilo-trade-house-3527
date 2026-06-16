import { withErrorHandling } from "@/lib/api/handler";
import { handleUpdateLeadStatus } from "@/features/leads/leads.controller";

// PATCH /api/leads/:id — update lead status (owner/admin)
export const PATCH = withErrorHandling(handleUpdateLeadStatus);
