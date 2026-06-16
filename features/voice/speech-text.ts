import { MAX_SPEAK_CHARS } from "./constants";

/**
 * Strip markdown + URLs from assistant text so it reads naturally when spoken,
 * and bound the length (TTS is billed per character). Links/listings still show
 * as cards in the chat — the spoken track just shouldn't read URLs aloud.
 */
export function cleanForSpeech(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → label only
    .replace(/https?:\/\/\S+/g, " ") // bare URLs
    .replace(/[*_#>~|]/g, " ") // leftover markdown punctuation
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SPEAK_CHARS);
}
