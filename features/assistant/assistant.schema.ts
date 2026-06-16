import { z } from "zod";

/**
 * Request guards for the assistant chat endpoint. The AI SDK's
 * `validateUIMessages` does the deep structural validation of each message;
 * this is the thin envelope check + the cost/latency bounds.
 */

/** Hard cap on conversation length accepted from a client. */
export const MAX_MESSAGES = 40;

/** Only the most recent turns are sent to the model, to bound cost + latency. */
export const CONTEXT_WINDOW = 20;

/** Max characters per text part — bounds prompt-token cost from a crafted client
 *  (`validateUIMessages` validates structure, not content length). */
export const MAX_TEXT_CHARS = 4000;

/**
 * Optional page context the widget forwards per send, so the assistant knows
 * what the user is looking at ("is this good value?" → the listing in focus).
 * All fields are bounded and treated as DATA, never instructions, in the prompt.
 */
export const assistantContextSchema = z.object({
  path: z.string().max(512).optional(),
  listingId: z.string().max(64).optional(),
  listingTitle: z.string().max(200).optional(),
  suburb: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  // Marks the listing in focus as an auction, so the assistant leans into
  // auction guidance (timing, unconditional sales, bidding) for "this".
  isAuction: z.boolean().optional(),
  label: z.string().max(120).optional(),
  // Voice turn: the reply will be read aloud, so ask for a concise spoken style.
  spoken: z.boolean().optional(),
});

export type AssistantContext = z.infer<typeof assistantContextSchema>;

/**
 * The chat transport posts `{ id?, messages, trigger?, ... }`. We require
 * `messages` (its element shape is validated downstream by `validateUIMessages`)
 * and accept an optional `context`; unknown keys (id/trigger) are stripped.
 */
export const chatRequestSchema = z.object({
  messages: z
    .array(z.unknown())
    .min(1, "No messages provided")
    .max(MAX_MESSAGES, "Conversation is too long. Start a new chat."),
  context: assistantContextSchema.optional(),
});
