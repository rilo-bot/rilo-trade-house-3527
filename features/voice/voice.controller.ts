import { isVoiceConfigured } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  BadRequestError,
  ServiceUnavailableError,
  TooManyRequestsError,
} from "@/lib/errors";
import { ok } from "@/lib/api/response";
import { synthesizeSpeech, transcribeAudio } from "./voice.service";
import {
  audioFormatForType,
  audioMetaSchema,
  speakRequestSchema,
} from "./voice.schema";

/**
 * HTTP boundary for speech-to-text. Validates + throttles, transcribes, and
 * returns `{ text }`. The transcript is then sent by the client through the
 * existing /api/assistant flow, so all tools + guardrails are inherited.
 */
export async function handleVoiceTranscribe(request: Request): Promise<Response> {
  if (!isVoiceConfigured()) {
    throw new ServiceUnavailableError("Voice input isn't available right now.");
  }

  // Throttle on a dedicated voice budget: signed-in users get more than guests.
  // Audio is costlier than a text turn, so the per-window cap is tighter than
  // the assistant's 40/15.
  const user = await getCurrentUser();
  const key = user
    ? `voice:user:${user.id}`
    : `voice:ip:${getClientIp(request)}`;
  const limit = user ? 30 : 10;
  const { ok: allowed, retryAfterSec } = await checkRateLimit(key, limit, 300); // per 5 min
  if (!allowed) {
    throw new TooManyRequestsError(
      "You're sending voice clips too quickly. Please wait a moment.",
      { retryAfterSec },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new BadRequestError("Expected an audio upload.");
  }

  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    throw new BadRequestError("No audio file provided.");
  }

  // Bound type + size before paying to transcribe (throws ZodError → 422).
  audioMetaSchema.parse({ type: file.type, size: file.size });

  const text = await transcribeAudio(file, audioFormatForType(file.type));
  return ok({ text });
}

/**
 * HTTP boundary for text-to-speech. Validates + throttles, then streams the
 * synthesized audio straight back over chunked HTTP (not the JSON envelope —
 * this returns binary, like the assistant route streams its reply).
 */
export async function handleVoiceSpeak(request: Request): Promise<Response> {
  if (!isVoiceConfigured()) {
    throw new ServiceUnavailableError("Spoken replies aren't available right now.");
  }

  const user = await getCurrentUser();
  const key = user
    ? `voice:speak:user:${user.id}`
    : `voice:speak:ip:${getClientIp(request)}`;
  // Replies are sentence-sized, so allow more calls than transcription.
  const limit = user ? 60 : 20;
  const { ok: allowed, retryAfterSec } = await checkRateLimit(key, limit, 300); // per 5 min
  if (!allowed) {
    throw new TooManyRequestsError(
      "You're generating speech too quickly. Please wait a moment.",
      { retryAfterSec },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Invalid request body");
  }
  const { text } = speakRequestSchema.parse(body);

  const { stream, contentType } = await synthesizeSpeech(text);
  return new Response(stream, {
    headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
  });
}
