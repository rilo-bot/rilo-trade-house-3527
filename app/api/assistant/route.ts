import { withErrorHandling } from "@/lib/api/handler";
import { handleAssistantChat } from "@/features/assistant/assistant.controller";

// Tools hit MongoDB, so this must run on the Node runtime (the default).
// Give the model room to stream a multi-step (tool-using) response.
export const maxDuration = 60;

// POST /api/assistant — streaming chat for the Trade House assistant.
export const POST = withErrorHandling(handleAssistantChat);
