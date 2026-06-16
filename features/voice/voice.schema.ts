import { z } from "zod";
import { MAX_SPEAK_CHARS } from "./constants";

/**
 * Input guards for the voice (speech-to-text) endpoint. The audio arrives as a
 * multipart upload (a `Blob`), so these validate the file's metadata + bound its
 * size — a cost/abuse guard, since the model is billed per second of audio.
 */

/** Hard cap on uploaded audio. 20 MB ≈ many minutes of Opus; far above a clip. */
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

/**
 * Container types MediaRecorder produces across browsers (Chrome/Firefox → webm,
 * Safari → mp4/m4a), plus common manual formats. Matched on the base type only,
 * since browsers append codecs (e.g. "audio/webm;codecs=opus").
 */
export const ACCEPTED_AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/mpga",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
] as const;

const ACCEPTED = new Set<string>(ACCEPTED_AUDIO_TYPES);

/** The bare container type, stripped of any `;codecs=...` suffix, lower-cased. */
export function baseAudioType(type: string): string {
  return type.split(";")[0]?.trim().toLowerCase() ?? "";
}

const FORMAT_BY_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mpga": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

/**
 * OpenRouter's transcription API takes the audio container as a `format` string
 * (e.g. "webm", "mp4", "wav"). Derive it from the upload's content-type.
 */
export function audioFormatForType(type: string): string {
  return FORMAT_BY_TYPE[baseAudioType(type)] ?? "webm";
}

/** Validates the uploaded clip's content-type + size before we pay to transcribe. */
export const audioMetaSchema = z.object({
  type: z
    .string()
    .refine((t) => ACCEPTED.has(baseAudioType(t)), "Unsupported audio format."),
  size: z
    .number()
    .int()
    .positive("Audio file is empty.")
    .max(MAX_AUDIO_BYTES, "Audio clip is too large."),
});

/** Shape returned to the client from POST /api/voice/transcribe. */
export const transcriptionResultSchema = z.object({ text: z.string() });
export type TranscriptionResult = z.infer<typeof transcriptionResultSchema>;

/**
 * Body for POST /api/voice/speak. Text is bounded — a cost guard, since TTS is
 * billed per character. The client sends short, sentence-sized chunks.
 */
export const speakRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Nothing to speak.")
    .max(MAX_SPEAK_CHARS, "Text is too long to read aloud."),
});
export type SpeakRequest = z.infer<typeof speakRequestSchema>;
