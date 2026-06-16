import { withErrorHandling } from "@/lib/api/handler";
import { handleVoiceSpeak } from "@/features/voice/voice.controller";

// Streams audio from OpenRouter over the network on the Node runtime (default).
export const maxDuration = 30;

// POST /api/voice/speak — text-to-speech for spoken assistant replies.
export const POST = withErrorHandling(handleVoiceSpeak);
