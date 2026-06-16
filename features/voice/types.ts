/** Types shared within the voice feature. */

/**
 * Lifecycle of a push-to-talk capture:
 *   idle → recording → transcribing → idle
 * (or back to idle on error, surfaced separately).
 */
export type RecorderStatus = "idle" | "recording" | "transcribing";
