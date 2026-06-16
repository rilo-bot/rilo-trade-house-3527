import { withErrorHandling } from "@/lib/api/handler";
import { handleCreateLead } from "@/features/leads/leads.controller";

// POST /api/leads — create an enquiry
export const POST = withErrorHandling(handleCreateLead);
