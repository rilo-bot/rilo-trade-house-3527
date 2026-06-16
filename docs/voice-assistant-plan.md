# Add Voice to the Trade House Assistant — Implementation Plan

> Status: **Phase 0, Phase 1 (dictation), and Phase 2 (turn-based voice-to-voice)
> implemented, with the guardrail layer and sentence-streamed TTS for low latency.**
> Future enhancement: optional native speech-to-speech "premium mode".
> Decisions locked: dictation first → then voice-to-voice; turn-based push-to-talk;
> cheapest TTS; reuse the existing OpenRouter key.

## Context

The Trade House assistant (`features/assistant/`) is today a text-only chat:
OpenRouter → `anthropic/claude-sonnet-4` via the Vercel AI SDK, streaming over HTTP/SSE,
with 11 server-side tools, a golden-rule guardrail system prompt, MongoDB rate limiting
and Better Auth. Goal: add **(1) voice-to-text dictation** and **(2) voice-to-voice
conversation** — smart, guard-railed, cost-sensitive, neutral model choice.

**Key finding that shapes everything:** Anthropic's Claude models (Opus 4.8 / Sonnet 4.6 /
Haiku 4.5) have **no native audio** — the Messages API is text + images + PDF only. So Claude
can only be the *brain*. Voice is therefore a **cascade**: speech-to-text → the existing Claude
pipeline → text-to-speech. This is the right call because it:

- **Keeps Claude as the brain** → the 11 tools, guardrail prompt, rate limiter and auth are
  reused with **zero re-implementation** (the single biggest reason to avoid native
  speech-to-speech, which would replace Claude and force re-building all of that).
- **Fits Vercel** → every leg is plain HTTP/SSE; **no persistent WebSocket server needed**
  (Vercel can't host one). The *turn-based push-to-talk* choice means we don't even need
  browser-direct streaming sockets or ephemeral tokens.
- **Is cheapest + most auditable** → every boundary is readable text you can log/moderate/redact.
  Verified ~8–18× cheaper than native speech-to-speech for our usage.

---

## Recommended models (neutral, verified mid-2026, cost-sensitive)

All routed through the **existing OpenRouter key** — OpenRouter added OpenAI-compatible audio
endpoints (`/api/v1/audio/transcriptions`, `/api/v1/audio/speech`) in May 2026, so **no new
vendor accounts**. Each is swappable by env var, mirroring the existing `OPENROUTER_MODEL` pattern.

| Role | Recommended | Price (verified) | Why / alternatives |
|------|-------------|------------------|--------------------|
| **Brain** (unchanged) | `anthropic/claude-sonnet-4` (current) | ~existing | Already smart + tool-using. Optional zero-code upgrade to `anthropic/claude-sonnet-4.6` (~$3/$15 per 1M tok) for sharper replies, or Opus for max smarts — just change `OPENROUTER_MODEL`. |
| **STT** (dictation + v2v) | `openai/gpt-4o-mini-transcribe` | ~$0.18/hr ($0.003/min) | Best accuracy/price for accented NZ English. Budget swap: `openai/whisper-1` or Groq fast-whisper (~$0.04/hr) — same route, change one env value. |
| **TTS** (spoken replies) | `openai/gpt-4o-mini-tts` | ~$0.015/min (~$12–15/1M chars) | Cheapest natural voice, steerable warm tone, HTTP chunked. Upgrade path (premium): Cartesia Sonic / ElevenLabs (~$37–110/1M) if naturalness becomes a priority — isolated behind the TTS service. |

**Honest tradeoff vs native speech-to-speech (OpenAI Realtime / Gemini Live):** native is faster
(~200–300 ms vs sub-1 s) and more natural, but costs **~$0.18–0.46/min (2–5×)**, grows with
conversation length, and **replaces Claude** — you'd lose the single-source tools + guardrails and
have to rebuild them on the provider's stack. Not worth it for a cost-sensitive marketplace
assistant. Keep it as an **optional, flagged-off "premium live mode"** only if users later demand
instant turn-taking.

---

## Architecture (the cascade — all HTTP, reuses `/api/assistant`)

```
Dictation (Phase 1):
  [mic] MediaRecorder clip ──POST──▶ /api/voice/transcribe ──▶ OpenRouter STT ──▶ text
        └────────────────────────────────────────────────────────▶ fills the chat composer
        (then the user sends it normally → existing /api/assistant, tools+guardrails inherited)

Voice-to-voice (Phase 2, turn-based push-to-talk):
  [mic] clip ─▶ /api/voice/transcribe ─▶ text
        text ─▶ EXISTING /api/assistant (streamText, Claude + 11 tools + guardrails, UNCHANGED)
                  + a "spoken style" hint via the existing AssistantContext
        streamed reply ──(sentence-buffered)──▶ /api/voice/speak ─▶ OpenRouter TTS ─▶ audio ─▶ playback
```

No WebSockets, no ephemeral tokens, no changes to the Claude tool/guardrail logic.

---

## Implementation

New module follows the AGENTS.md feature structure under `features/voice/`. Thin route handlers
under `app/api/voice/`. Reuses `lib/api/handler.ts` `withErrorHandling`, `lib/errors.ts`,
`lib/api/response.ts`, `lib/rate-limit.ts` `checkRateLimit`/`getClientIp`, and
`lib/auth/guards.ts` `getCurrentUser`.

> **Before coding:** per AGENTS.md, re-read the current Next 16 + `ai@6` audio docs in
> `node_modules/` and the live OpenRouter audio API (these endpoints are newer). The AI SDK's
> `experimental_transcribe`/`experimental_generateSpeech` are batch/one-shot — fine for turn-based.
> Since we reuse OpenRouter (not a first-class AI-SDK audio provider), call its OpenAI-compatible
> audio endpoints via a small typed `fetch` wrapper in the service. If OpenRouter audio proves
> limiting, fall back to a dedicated `OPENAI_API_KEY` + the AI SDK's first-class audio functions.

### Phase 0 — Setup (config, no behaviour yet) ✅ DONE
- [x] **`lib/env.ts`:** added optional vars beside the existing AI block — `VOICE_STT_MODEL`
  (default `openai/gpt-4o-mini-transcribe`), `VOICE_TTS_MODEL` (default `openai/gpt-4o-mini-tts`),
  `VOICE_TTS_VOICE` (default `alloy`). Documented in `.env.example`.
- [x] **`lib/ai.ts`:** added `isVoiceConfigured()` (reuses `OPENROUTER_API_KEY`) +
  `OPENROUTER_AUDIO_BASE_URL` const — same optional-feature pattern as `isAiConfigured()`.

### Phase 1 — Voice-to-text dictation ✅ DONE
- [x] **`features/voice/voice.schema.ts`** — Zod bounds: `MAX_AUDIO_BYTES` (20 MB), accepted mime
  types (base-type matched), `audioMetaSchema`, plus `filenameForType`/`baseAudioType` helpers.
- [x] **`features/voice/voice.service.ts`** — `transcribeAudio(blob, filename)`: POST to OpenRouter
  `/api/v1/audio/transcriptions` (via `OPENROUTER_AUDIO_BASE_URL`) with the configured STT model;
  returns trimmed text. No HTTP/Response here; throws `AppError` subclasses on failure.
- [x] **`features/voice/voice.controller.ts`** — `handleVoiceTranscribe(request)`: 503 if unconfigured →
  `getCurrentUser` → voice rate-limit key (`voice:user|ip`, 30/10 per 5 min) → `audioMetaSchema` size/type
  cap → `transcribeAudio` → `ok({ text })`.
- [x] **`app/api/voice/transcribe/route.ts`** — `export const POST = withErrorHandling(handleVoiceTranscribe)` (`maxDuration = 30`).
- [x] **`features/voice/hooks/use-voice-recorder.ts`** (`"use client"`) — `getUserMedia` +
  `MediaRecorder` with **silence detection (Web Audio analyser/RMS)**: click to listen, auto-stops
  ~2 s after speech ends (or 5 s if no speech) with a short beep, then transcribes. 60 s hard cap;
  states `idle|recording|transcribing`; permission-denied + empty-transcript handled. SSR-safe
  capability read via `useSyncExternalStore`.
- [x] **`features/voice/components/voice-record-button.tsx`** (`"use client"`) — mic button (lucide
  `Mic`/`Loader2`) with a pulsing "listening" halo (no separate stop button — tap again to stop early);
  renders nothing if recording is unsupported; bubbles errors via `onError`.
- [x] **Wired into the chat input** in `features/assistant/components/assistant-widget.tsx`: mic button
  sits between the composer and Send; transcript is **appended** to the composer for review then sent
  normally; recorder errors show in a dismissible alert above the form.

**Deviations from plan (intentional):** the mic gates on **browser recording support** (feature
detection) rather than a client `isVoiceConfigured()` (server-only); when voice is unconfigured the
route returns 503 and the alert shows the message — same "errors if AI off" behaviour as the existing
chat input. STT/TTS run via a direct `fetch` to OpenRouter's audio endpoints (the AI SDK's
`experimental_transcribe` has no OpenRouter provider). **Important:** OpenRouter's audio API is
**JSON, not OpenAI-style multipart** — transcription posts `{ model, input_audio: { data: <base64>,
format } }` and returns `{ text }`; speech posts `{ model, input, voice, response_format }`. (The
browser→our-route leg is still multipart; only the route→OpenRouter leg is JSON.)

**Phase 1 needs ZERO change to `/api/assistant`** — dictated text is just normal chat input, so it
inherits all tools + guardrails automatically.

### Phase 2 — Turn-based voice-to-voice ✅ DONE
- [x] **Spoken-style hint:** added optional `spoken?: boolean` to **both** `AssistantContext` types
  (`stores/assistant-store.ts` + `features/assistant/assistant.schema.ts`); `systemPrompt()` appends a
  "VOICE MODE … concise spoken style, no markdown/URLs, ~60 words" line when set. The widget's `send()`
  now takes `{ spoken }` and flags voice turns.
- [x] **`features/voice/voice.service.ts`** — added `synthesizeSpeech(text)`: POST to OpenRouter
  `/api/v1/audio/speech` (`VOICE_TTS_MODEL`/`VOICE_TTS_VOICE`); returns `{ stream, contentType }`.
  **Note:** OpenAI TTS is **not served on OpenRouter**, so `VOICE_TTS_MODEL` defaults to
  `x-ai/grok-voice-tts-1.0` (voice `Ara`; voices: Eve/Ara/Rex/Sal/Leo). Alternatives:
  `google/gemini-3.1-flash-tts-preview`, `microsoft/mai-voice-2` — switch `VOICE_TTS_VOICE` to match.
  Upstream OpenRouter errors are now surfaced in the UI alert so model/voice issues are diagnosable.
- [x] **English-only:** transcription is forced to English (`language: "en"`) so spoken input isn't
  auto-detected as another language, and the system prompt requires English replies regardless of input.
- [x] **`app/api/voice/speak/route.ts`** + `handleVoiceSpeak` — validated text (`speakRequestSchema`,
  `MAX_SPEAK_CHARS`), dedicated `voice:speak:*` rate limit (60/20 per 5 min), streams audio over chunked HTTP.
- [x] **`features/voice/hooks/use-tts-playback.ts`** (`"use client"`) — speaks each newly-completed
  reply once (MVP: whole-reply on completion; baselines on enable so history isn't replayed); `speaking`
  driven by audio events; `stop()` cancels in-flight synth + playback. `cleanForSpeech` strips markdown/URLs.
- [x] **Voice mode UI:** header toggle (`Volume2`/`VolumeX`) in `assistant-widget.tsx`; in voice mode the
  mic transcript **auto-sends** with `spoken: true` and the reply auto-plays. Reuses the Phase 1 recorder.

**Latency:** TTS is **sentence-streamed** — as the reply streams in, each finished sentence is
synthesized and played immediately, with the next prefetched while the current plays
(`use-tts-playback.ts`). Audio starts moments after the first sentence rather than after the whole
reply + full synthesis.

### Guardrails (cross-cutting — built into both phases)

**Implemented:** (1) model-side reuse via `/api/assistant`; (2) dedicated voice rate-limit keys
(`voice:user|ip` 30/10 for STT, `voice:speak:*` 60/20 for TTS, per 5 min); (3) input caps —
`MAX_AUDIO_BYTES` 20 MB + accepted-type check on transcribe, `MAX_SPEAK_CHARS` 2000-char cap on
speak; (4) server-only OpenRouter key, no secret in the browser; (5) **no audio/transcript
persistence** — neither route writes to the DB (transcribe returns text to the client; speak streams
audio); (6) third-party voice **disclosure** line in the widget footer when recording is supported.
**Deferred (ops/product, not code):** privacy-policy update, provider no-retention flags, optional
OpenAI `omni-moderation` (needs a separate key), true per-user spoken-minutes/day metering.

1. **Model-side (free, primary):** the existing Claude golden-rule system prompt + 11 tools are
   reused verbatim via `/api/assistant` — voice input is just text entering the current pipeline, so
   no guardrail re-implementation. STT output is treated as **data, not instructions** (the prompt
   already does this for tool output) → blocks voice-borne prompt injection.
2. **Rate / abuse limits:** extend `lib/rate-limit.ts` usage with dedicated voice keys
   (`voice:user:{id}` / `voice:ip:{ip}`) — a per-request cap **and** a per-user spoken-minutes/day
   cap; keep the existing 40/5 min user, 15/5 min guest, `MAX_TEXT_CHARS` limits on the text leg.
3. **Input caps:** hard bytes + duration cap on `/api/voice/transcribe`; text-length cap on `/api/voice/speak`.
4. **Auth + secrets:** every `/api/voice/*` route is `getCurrentUser`-gated where appropriate; the
   OpenRouter key stays server-only (browser only ever calls our own routes — no key in the client).
5. **Privacy (NZ Privacy Act 2020, IPP 3):** one-time consent/disclosure before the first mic capture;
   persist **transcripts (text), not raw audio**, with a short TTL; set provider no-retention/no-training
   flags where available; update the privacy policy. (Plain STT/TTS is *not* biometric — the Nov-2025
   Biometrics Code does not apply unless speaker-ID/voiceprints are added.)
6. **Optional extra moderation:** if you later add an `OPENAI_API_KEY`, run the **free**
   `omni-moderation-latest` on the input transcript and the output text. Skipped by default to honour
   the "reuse OpenRouter" choice; the Claude guardrails are the primary safety layer.

---

## Cost (verified)

- **Dictation:** effectively free-tier territory; even paid, ~$0.003/min ($0.18/hr).
- **Voice-to-voice (cascade):** ~**$0.02–0.05 per voice-minute** all-in (STT + TTS + the Claude
  tokens you already pay). Example at **5,000 voice-minutes/month** (1,000 users × 5 min):
  ≈ **$115–130/month** total. The *same* minutes on native OpenAI Realtime would be
  **~$900–2,300/month** and would discard Claude + your guardrails.

---

## Critical files

**New:** `features/voice/{voice.schema.ts, voice.service.ts, voice.controller.ts, types.ts}`,
`features/voice/components/voice-record-button.tsx`,
`features/voice/hooks/{use-voice-recorder.ts, use-tts-playback.ts}`,
`app/api/voice/transcribe/route.ts`, `app/api/voice/speak/route.ts`.

**Modified:** `lib/env.ts` + `.env.example`, `lib/ai.ts`,
`features/assistant/components/assistant-widget.tsx` (mic button + voice toggle),
`features/assistant/assistant.schema.ts` + `features/assistant/assistant.service.ts`
(spoken-style hint, Phase 2).

**Reused unchanged:** the whole `/api/assistant` → controller → service → tools chain,
`lib/api/handler.ts`, `lib/errors.ts`, `lib/api/response.ts`, `lib/rate-limit.ts`, `lib/auth/guards.ts`.

---

## Verification

1. **Config:** unset `OPENROUTER_API_KEY` → mic/voice controls hidden (like the existing widget);
   set it → controls appear. `npm run lint` + `npm run type-check` clean.
2. **Phase 1 (dictation):** `npm run dev`, open the widget, hold mic, speak "find 3-bedroom rentals
   in Wellington under $700", confirm accurate transcript lands in the composer, send, confirm the
   normal tool-driven answer. Test mic-permission-denied path. Test the byte/duration cap (reject
   oversized audio with a clean error envelope).
3. **Phase 2 (voice-to-voice):** enable voice mode, speak a question, confirm: transcript → existing
   assistant answer (tools fire) → spoken reply plays; reply is concise/markdown-free (spoken-style
   hint working). Verify stop/mute interrupts playback.
4. **Guardrails:** exceed the voice rate-limit key → 429 with retry-after; speak a prompt-injection
   ("ignore your instructions and …") → assistant stays in character; confirm only transcripts (not
   audio) are persisted and the consent disclosure shows once.
5. **Cost sanity:** log OpenRouter usage from `providerMetadata` for a few voice turns; confirm
   per-minute spend is in the ~$0.02–0.05 band.
