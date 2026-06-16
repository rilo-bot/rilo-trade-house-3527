/**
 * Voice constants shared between server (schema/controller) and client (the TTS
 * playback util). Kept dependency-free so importing it into client code doesn't
 * pull Zod into the browser bundle.
 */

/** Upper bound on characters synthesized per text-to-speech request. */
export const MAX_SPEAK_CHARS = 2000;
