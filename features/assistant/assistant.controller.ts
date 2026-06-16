import { validateUIMessages } from "ai";
import { isAiConfigured } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth/guards";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  BadRequestError,
  ServiceUnavailableError,
  TooManyRequestsError,
} from "@/lib/errors";
import { streamAssistant } from "./assistant.service";
import {
  CONTEXT_WINDOW,
  MAX_TEXT_CHARS,
  chatRequestSchema,
} from "./assistant.schema";

/**
 * HTTP boundary for the assistant. Validates + throttles, then hands the
 * streaming response straight back. Errors thrown here (before streaming
 * starts) are formatted by `withErrorHandling`; errors mid-stream are handled
 * by `toUIMessageStreamResponse`'s `onError`.
 */
export async function handleAssistantChat(request: Request): Promise<Response> {
  if (!isAiConfigured()) {
    throw new ServiceUnavailableError("The assistant isn't available right now.");
  }

  // Identify + throttle: signed-in users get a per-user budget, guests a
  // per-IP one. Reuses the same Mongo limiter as the leads endpoint.
  const user = await getCurrentUser();
  const key = user
    ? `assistant:user:${user.id}`
    : `assistant:ip:${getClientIp(request)}`;
  const limit = user ? 40 : 15;
  const { ok, retryAfterSec } = await checkRateLimit(key, limit, 300); // per 5 min
  if (!ok) {
    throw new TooManyRequestsError(
      "You're sending messages too quickly. Please wait a moment.",
      { retryAfterSec },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("Invalid request body");
  }

  // Envelope check (count bounds + optional page context) then deep UIMessage
  // validation.
  const { messages: raw, context } = chatRequestSchema.parse(body);
  const messages = await validateUIMessages({ messages: raw });

  // Bound per-message text size — a cost guard, since `validateUIMessages` checks
  // structure, not content length. The normal UI never sends this much.
  for (const m of messages) {
    for (const part of m.parts) {
      if (part.type === "text" && part.text.length > MAX_TEXT_CHARS) {
        throw new BadRequestError("Your message is too long. Please shorten it.");
      }
    }
  }

  const result = await streamAssistant(
    messages.slice(-CONTEXT_WINDOW),
    user,
    context,
  );
  return result.toUIMessageStreamResponse({
    onError(error) {
      console.error("[assistant] stream error:", error);
      return "Sorry — something went wrong generating a response. Please try again.";
    },
  });
}
