import { withErrorHandling } from "@/lib/api/handler";
import { handleVoiceTranscribe } from "@/features/voice/voice.controller";

// Calls OpenRouter over the network and reads a multipart body, so this runs on
// the Node runtime (the default). Transcription of a short clip is quick.
export const maxDuration = 30;

// POST /api/voice/transcribe — speech-to-text for dictation into the chat.
export const POST = withErrorHandling(handleVoiceTranscribe);
