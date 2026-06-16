"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Loader2, MessageCircle, Volume2, VolumeX, X } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/stores/assistant-store-provider";
import { useSpeak } from "@/features/voice/hooks/use-speak";
import { useRecordingSupported } from "@/features/voice/hooks/use-recording-supported";
import type { InsightResponse } from "../insights.schema";

/**
 * Ava — the on-screen guide character. A standing avatar anchored bottom-right
 * that, on every page, fetches ONE short spoken-style insight about what the
 * visitor is looking at (`POST /api/assistant/insights`), shows it in a speech
 * bubble, and reads it aloud. On a property she describes the home and gives an
 * honest read on value; on an auction she covers timing and how bidding works;
 * elsewhere she greets and points the way.
 *
 * She's the launcher for the full chat: clicking the figure opens the assistant
 * panel, and the bubble's CTA hands off to a real conversation (reusing the same
 * `ask()` + page context the chat already runs on). Closed by default state is
 * deterministic; renders nothing until mounted (SSR-safe) so it can't flash.
 *
 * `suppressed` (a chat thread already exists) keeps the figure as a launcher but
 * skips the auto-greeting + voice, so a returning user mid-conversation isn't
 * re-narrated at.
 */

/** Remember the user's voice choice for the session (stopping = "don't auto-read"). */
const VOICE_PREF_KEY = "th-guide-voice";

function readVoicePref(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(VOICE_PREF_KEY) !== "off";
}

export function AssistantGuide({ suppressed = false }: { suppressed?: boolean }) {
  const pathname = usePathname() ?? "/";
  const context = useAssistantStore((s) => s.context);
  const setOpen = useAssistantStore((s) => s.setOpen);
  const ask = useAssistantStore((s) => s.ask);
  const voiceSupported = useRecordingSupported();

  const mounted = useMounted();
  const { speak, stop, speaking, loading: speechLoading } = useSpeak();

  const [insight, setInsight] = useState<InsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  // "bubble" — speech shown; "idle" — dismissed to just the figure.
  const [view, setView] = useState<"bubble" | "idle">("bubble");
  // Voice on/off for the session (auto-read each new insight when on). Read
  // lazily from sessionStorage (SSR-safe — guarded; nothing renders pre-mount).
  const [voiceOn, setVoiceOn] = useState<boolean>(() => readVoicePref());
  // Autoplay was blocked (no gesture yet) — nudge the user to tap to hear.
  const [needsTap, setNeedsTap] = useState(false);

  // Ava only appears on property/auction DETAIL pages, so there's always a
  // specific listing in focus. The listing loads client-side, so `listingId`
  // arrives a beat after we mount; until then we hold the "looking…" state
  // rather than narrate a generic page line. A change of listing starts a fresh
  // insight. Suburb/region ride along to ground the copy.
  const listingId = context?.listingId;
  const suburb = context?.suburb;
  const region = context?.region;
  const insightKey = `${pathname}::${listingId ?? ""}::${suburb ?? ""}`;

  // When the page/listing changes, reset to a fresh bubble DURING RENDER (the
  // "adjust state when a key changes" pattern) rather than via a setState-in-
  // effect. The actual fetch happens in the effect below; this just primes the
  // loading UI so there's no stale flash between pages.
  const [syncedKey, setSyncedKey] = useState<string | null>(null);
  if (mounted && !suppressed && syncedKey !== insightKey) {
    setSyncedKey(insightKey);
    setView("bubble");
    setNeedsTap(false);
    setInsight(null);
    setLoading(true);
  }

  // Keep the latest voice intent available to the fetch effect without making
  // it a dependency (we don't want a pref toggle to refetch the insight).
  const voiceOnRef = useRef(voiceOn);
  const voiceSupportedRef = useRef(voiceSupported);
  const speakRef = useRef(speak);
  useEffect(() => {
    voiceOnRef.current = voiceOn;
    voiceSupportedRef.current = voiceSupported;
    speakRef.current = speak;
  });

  // Fetch the insight for the listing in focus, then (optionally) read it aloud.
  // Waits for `listingId` (the listing loads client-side) so we never narrate a
  // generic line first. Re-runs when the listing changes; aborts a stale request
  // if the user navigates again before it lands. All setState here happens AFTER
  // an await (allowed), never synchronously in the effect body.
  useEffect(() => {
    if (!mounted || suppressed || !listingId) return;
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/assistant/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname, listingId, suburb, region }),
          signal: ac.signal,
        });
        const json = (await res.json().catch(() => null)) as {
          data?: InsightResponse | null;
        } | null;
        if (ac.signal.aborted) return;
        const data = json?.data ?? null;
        setInsight(data);
        setLoading(false);
        // Read it aloud if voice is on + supported. Autoplay may be blocked
        // before any gesture — fall back to a "tap to hear" nudge, not an error.
        if (data?.text && voiceOnRef.current && voiceSupportedRef.current) {
          speakRef.current(data.text).catch(() => setNeedsTap(true));
        }
      } catch {
        if (ac.signal.aborted) return;
        setLoading(false);
        // Network/parse failure — stay quiet rather than show a broken bubble.
      }
    })();

    return () => ac.abort();
    // insightKey captures pathname + listingId + suburb; region rarely differs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightKey, mounted, suppressed]);

  // If the listing never resolves (e.g. a 404'd detail page), quietly drop the
  // "looking…" bubble after a grace period so Ava doesn't sit thinking forever —
  // she stays a clickable launcher. Cleared the moment a listingId arrives.
  useEffect(() => {
    if (!mounted || suppressed || listingId) return;
    const timer = setTimeout(() => setView("idle"), 5000);
    return () => clearTimeout(timer);
  }, [mounted, suppressed, listingId]);

  const openChat = useCallback(() => {
    stop();
    setOpen(true);
  }, [stop, setOpen]);

  // The bubble CTA → open the chat and auto-ask the follow-up, carrying context.
  const askFollowUp = useCallback(() => {
    stop();
    const prompt = insight?.followUp ?? "Tell me more about this.";
    ask(prompt, context ?? undefined);
  }, [stop, insight, ask, context]);

  // Speaker toggle: stop if playing, otherwise (re)play — a tap is a gesture, so
  // this always works even when autoplay was blocked. Stopping turns auto-read
  // off for the session; playing turns it back on.
  const toggleVoice = useCallback(() => {
    setNeedsTap(false);
    if (speaking || speechLoading) {
      stop();
      setVoiceOn(false);
      try {
        sessionStorage.setItem(VOICE_PREF_KEY, "off");
      } catch {
        /* ignore */
      }
      return;
    }
    setVoiceOn(true);
    try {
      sessionStorage.setItem(VOICE_PREF_KEY, "on");
    } catch {
      /* ignore */
    }
    if (insight?.text) speak(insight.text).catch(() => undefined);
  }, [speaking, speechLoading, stop, insight, speak]);

  const dismiss = useCallback(() => {
    stop();
    setView("idle");
  }, [stop]);

  if (!mounted) return null;

  const showBubble = !suppressed && view === "bubble" && (loading || !!insight);

  return (
    <div className="pointer-events-none flex w-[min(22rem,calc(100vw-2rem))] flex-col items-end gap-2">
      {/* Speech bubble — the spoken insight, with voice + close controls. */}
      {showBubble && (
        <div
          key={insightKey}
          role="status"
          aria-live="polite"
          className="border-border bg-card text-card-foreground pointer-events-auto relative max-w-full rounded-3xl rounded-br-md border px-4 py-3.5 pr-10 text-sm leading-relaxed shadow-xl duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
        >
          {/* Close — drops to just the figure (still a launcher). */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide Ava's message"
            className="text-muted-foreground hover:text-foreground hover:bg-accent absolute top-2.5 right-2.5 rounded-full p-1 transition-colors"
          >
            <X className="size-3.5" />
          </button>

          {loading ? (
            <span className="text-muted-foreground flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Taking a look…
            </span>
          ) : (
            <>
              <p>{insight?.text}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={askFollowUp}
                  className="text-primary inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                >
                  <MessageCircle className="size-3.5" />
                  Ask Ava more
                </button>

                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    aria-label={
                      speaking
                        ? "Stop reading aloud"
                        : voiceOn
                          ? "Read aloud again"
                          : "Turn on voice"
                    }
                    aria-pressed={speaking}
                    className={cn(
                      "text-muted-foreground hover:text-foreground hover:bg-accent grid size-7 shrink-0 place-items-center rounded-full transition-colors",
                      speaking && "text-primary",
                      needsTap &&
                        "text-primary ring-primary/40 motion-safe:animate-pulse ring-2",
                    )}
                    title={
                      needsTap
                        ? "Tap to hear Ava"
                        : speaking
                          ? "Stop"
                          : "Read aloud"
                    }
                  >
                    {speechLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : voiceOn && !needsTap ? (
                      <Volume2 className="size-4" />
                    ) : (
                      <VolumeX className="size-4" />
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* The character — clicking opens the full chat. A soft glow + speaking
          bob make her feel alive without being distracting. */}
      <div className="pointer-events-auto relative">
        <span
          aria-hidden
          className="bg-primary/25 pointer-events-none absolute right-2 bottom-3 size-16 rounded-full blur-2xl"
        />
        <button
          type="button"
          onClick={openChat}
          aria-label="Open Ava, your Trade House guide"
          className="group relative block cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Image
            src="/avatar/ava.png"
            alt="Ava, the Trade House property guide"
            width={363}
            height={818}
            priority={false}
            draggable={false}
            className={cn(
              "h-40 w-auto select-none drop-shadow-xl transition-transform duration-300 group-hover:scale-[1.03] sm:h-52 lg:h-64",
              speaking && "guide-bob",
            )}
          />
        </button>
        {/* "Live" chat affordance badge so she clearly reads as interactive. */}
        <span className="bg-primary text-primary-foreground pointer-events-none absolute -top-1 -left-1 grid size-7 place-items-center rounded-full shadow-md ring-2 ring-background">
          <MessageCircle className="size-3.5" />
        </span>
      </div>
    </div>
  );
}
