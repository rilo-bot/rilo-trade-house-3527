import { env } from "@/lib/env";
import { OPENROUTER_AUDIO_BASE_URL } from "@/lib/ai";
import { ServiceUnavailableError, TooManyRequestsError } from "@/lib/errors";

/** Force English transcription so spoken input isn't auto-detected as another
 *  language (e.g. "hello" coming back as Devanagari). */
const STT_LANGUAGE = "en";

/** Pull a concise reason out of an OpenRouter error body, for surfacing/logging. */
function upstreamMessage(body: string): string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    /* not JSON */
  }
  return body.slice(0, 160);
}

/**
 * Voice business logic: turns recorded audio into text via OpenRouter's
 * OpenAI-compatible transcription endpoint. No HTTP boundary here — the
 * controller owns request/response; this takes a `Blob` in and returns a string.
 *
 * Keeping the brain (Claude) untouched: this only produces transcript text,
 * which the client then sends through the EXISTING /api/assistant pipeline — so
 * dictation inherits all tools + guardrails for free.
 */

/**
 * Transcribe a recorded audio clip. Returns the (trimmed) transcript, possibly
 * empty if the model heard nothing.
 *
 * @param audio  the recorded clip (the Blob from our multipart upload route)
 * @param format the audio container, e.g. "webm" / "mp4" / "wav" (see
 *               `audioFormatForType`) — sent to the model as `input_audio.format`
 */
export async function transcribeAudio(
  audio: Blob,
  format: string,
): Promise<string> {
  if (!env.OPENROUTER_API_KEY) {
    // Mirrors the assistant: the feature is optional and 503s until configured.
    throw new ServiceUnavailableError("Voice input isn't available right now.");
  }

  // OpenRouter's transcription endpoint expects a JSON body with base64-encoded
  // raw audio bytes (NOT an OpenAI-style multipart file upload, and NOT a data
  // URI). See https://openrouter.ai/docs/guides/overview/multimodal/stt
  const base64 = Buffer.from(await audio.arrayBuffer()).toString("base64");

  let res: Response;
  try {
    res = await fetch(`${OPENROUTER_AUDIO_BASE_URL}/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // Same attribution headers the chat model uses (rankings/abuse handling).
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
        "X-Title": "Trade House",
      },
      body: JSON.stringify({
        model: env.VOICE_STT_MODEL,
        input_audio: { data: base64, format },
        language: STT_LANGUAGE,
      }),
    });
  } catch (cause) {
    console.error("[voice] transcription request failed:", cause);
    throw new ServiceUnavailableError(
      "Couldn't reach the voice service. Please try again.",
    );
  }

  const raw = await res.text();

  if (!res.ok) {
    console.error("[voice] transcription error:", res.status, raw.slice(0, 500));
    if (res.status === 429) {
      throw new TooManyRequestsError(
        "The voice service is busy. Please try again shortly.",
      );
    }
    const hint = upstreamMessage(raw);
    throw new ServiceUnavailableError(
      hint
        ? `Couldn't transcribe that audio: ${hint}`
        : "Couldn't transcribe that audio. Please try again.",
    );
  }

  // The response is JSON ({ text, usage }); fall back to a plain-text body just
  // in case a provider returns the transcript directly.
  try {
    const data = JSON.parse(raw) as { text?: unknown };
    if (typeof data?.text === "string") return data.text.trim();
    return "";
  } catch {
    return raw.trim();
  }
}

/**
 * Synthesize speech for a short piece of text. Returns the upstream audio stream
 * + its content-type so the controller can pipe it straight to the client over
 * chunked HTTP (no WebSocket needed — fits Vercel).
 */
export async function synthesizeSpeech(
  text: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string }> {
  if (!env.OPENROUTER_API_KEY) {
    throw new ServiceUnavailableError("Spoken replies aren't available right now.");
  }

  let res: Response;
  try {
    res = await fetch(`${OPENROUTER_AUDIO_BASE_URL}/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
        "X-Title": "Trade House",
      },
      body: JSON.stringify({
        model: env.VOICE_TTS_MODEL,
        voice: env.VOICE_TTS_VOICE,
        input: text,
        response_format: "mp3",
      }),
    });
  } catch (cause) {
    console.error("[voice] speech request failed:", cause);
    throw new ServiceUnavailableError(
      "Couldn't reach the voice service. Please try again.",
    );
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    console.error("[voice] speech error:", res.status, detail.slice(0, 500));
    if (res.status === 429) {
      throw new TooManyRequestsError(
        "The voice service is busy. Please try again shortly.",
      );
    }
    const hint = upstreamMessage(detail);
    throw new ServiceUnavailableError(
      hint
        ? `Couldn't generate the spoken reply: ${hint}`
        : "Couldn't generate the spoken reply. Please try again.",
    );
  }

  return {
    stream: res.body,
    contentType: res.headers.get("content-type") ?? "audio/mpeg",
  };
}
