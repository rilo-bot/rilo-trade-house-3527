import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "@/lib/env";

/**
 * AI provider wiring for the Trade House assistant.
 *
 * We talk to OpenRouter through the Vercel AI SDK so the model is swappable via
 * env (`OPENROUTER_MODEL`) without code changes. The API key is server-only and
 * never reaches the browser — the chat widget only ever calls our own
 * `/api/assistant` route, which holds the key.
 *
 * Like S3 / SendGrid elsewhere in this app, the feature is OPTIONAL: when
 * `OPENROUTER_API_KEY` is unset, `isAiConfigured()` is false and the route
 * responds 503 (the widget then hides itself) instead of crashing.
 */
export function isAiConfigured(): boolean {
  return Boolean(env.OPENROUTER_API_KEY);
}

/**
 * Voice (dictation / spoken replies) rides on the same OpenRouter key via its
 * OpenAI-compatible audio endpoints, so it's configured exactly when the
 * assistant is. Kept as its own function so a future split (e.g. a dedicated
 * audio key) is a one-line change, and so callers read clearly.
 */
export function isVoiceConfigured(): boolean {
  return isAiConfigured();
}

/** Base URL for OpenRouter's OpenAI-compatible audio endpoints. */
export const OPENROUTER_AUDIO_BASE_URL = "https://openrouter.ai/api/v1/audio";

let cached: ReturnType<typeof createOpenRouter> | null = null;

function provider(): ReturnType<typeof createOpenRouter> {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error(
      "AI assistant is not configured — set OPENROUTER_API_KEY in the environment.",
    );
  }
  if (!cached) {
    cached = createOpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
      // OpenRouter uses these to attribute traffic to the app (rankings + abuse
      // handling). Harmless if omitted, useful in production.
      headers: {
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
        "X-Title": "Trade House",
      },
    });
  }
  return cached;
}

/**
 * The configured chat model. When a fallback is set, OpenRouter is told to route
 * to `[primary, fallback]` so a primary outage degrades instead of failing.
 * `usage: { include: true }` surfaces token/cost accounting in `providerMetadata`
 * for later logging.
 */
export function getChatModel() {
  const models = env.OPENROUTER_FALLBACK_MODEL
    ? [env.OPENROUTER_MODEL, env.OPENROUTER_FALLBACK_MODEL]
    : undefined;

  return provider()(env.OPENROUTER_MODEL, {
    usage: { include: true },
    ...(models ? { extraBody: { models } } : {}),
  });
}
