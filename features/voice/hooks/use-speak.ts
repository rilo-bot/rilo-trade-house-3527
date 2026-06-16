"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cleanForSpeech } from "../speech-text";

export interface UseSpeak {
  /** Synthesize + play a block of text. Cancels any current playback first. */
  speak: (text: string) => Promise<void>;
  /** Stop playback and cancel any in-flight synthesis. */
  stop: () => void;
  /** True while audio is playing. */
  speaking: boolean;
  /** True while synthesis is being fetched (before audio starts). */
  loading: boolean;
}

/**
 * Minimal, imperative text-to-speech for one-shot lines (the guide character's
 * spoken insight) — distinct from `useTtsPlayback`, which streams a chat reply
 * sentence-by-sentence. POSTs the (speech-cleaned) text to `/api/voice/speak`
 * and plays the returned MP3.
 *
 * Browsers block audio that plays without a prior user gesture, so `speak()`
 * may reject quietly on first load; callers should treat that as "couldn't
 * autoplay" and offer a tap-to-hear affordance rather than surface an error.
 */
export function useSpeak(opts?: {
  onError?: (message: string | null) => void;
}): UseSpeak {
  const onError = opts?.onError;
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cleanup();
    setSpeaking(false);
    setLoading(false);
  }, [cleanup]);

  // Free resources on unmount.
  useEffect(() => () => stop(), [stop]);

  const speak = useCallback(
    async (text: string) => {
      const cleaned = cleanForSpeech(text);
      if (!cleaned) return;

      // Cancel anything already playing/fetching.
      abortRef.current?.abort();
      cleanup();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);

      let blob: Blob;
      try {
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleaned }),
          signal: ac.signal,
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error?: { message?: string } | null;
          } | null;
          throw new Error(
            json?.error?.message ?? "Couldn't play the spoken reply.",
          );
        }
        blob = await res.blob();
      } catch (err) {
        setLoading(false);
        if (ac.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        onErrorRef.current?.(
          err instanceof Error ? err.message : "Couldn't play the spoken reply.",
        );
        return;
      }

      if (ac.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.addEventListener("playing", () => setSpeaking(true));
      audio.addEventListener("pause", () => setSpeaking(false));
      audio.addEventListener(
        "ended",
        () => {
          setSpeaking(false);
          cleanup();
        },
        { once: true },
      );
      ac.signal.addEventListener("abort", () => audio.pause(), { once: true });

      setLoading(false);
      try {
        await audio.play();
      } catch (err) {
        // Autoplay blocked (no user gesture yet) or aborted — not a real error.
        setSpeaking(false);
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          throw err;
        }
      }
    },
    [cleanup],
  );

  return { speak, stop, speaking, loading };
}
