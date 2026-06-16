"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { cleanForSpeech } from "../speech-text";

/** Concatenate the text parts of a message (ignores tool-result/card parts). */
function extractText(message: UIMessage): string {
  let text = "";
  for (const part of message.parts) {
    if (part.type === "text") text += (text ? " " : "") + part.text;
  }
  return text;
}

/**
 * Pull complete sentences out of a streaming buffer. Returns finished sentences
 * and the trailing partial that hasn't terminated yet. Avoids splitting decimals
 * like "3.5" or "$1.2m".
 */
function splitSentences(buf: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c !== "." && c !== "!" && c !== "?" && c !== "\n") continue;
    if (c === "." && /\d/.test(buf[i - 1] ?? "") && /\d/.test(buf[i + 1] ?? "")) {
      continue; // decimal point, not a sentence end
    }
    let end = i + 1;
    while (end < buf.length && /["')\]]/.test(buf[end])) end++;
    // Only a real boundary if followed by whitespace/end (newline always counts).
    if (c !== "\n" && end < buf.length && !/\s/.test(buf[end])) continue;
    const s = buf.slice(start, end).trim();
    if (s) sentences.push(s);
    while (end < buf.length && /\s/.test(buf[end])) end++;
    start = end;
    i = end - 1;
  }
  return { sentences, rest: buf.slice(start) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface UseTtsPlayback {
  /** True while a spoken reply is playing. */
  speaking: boolean;
  /** Stop playback + cancel any in-flight synthesis. */
  stop: () => void;
}

/**
 * Speaks each assistant reply aloud while voice mode is on, STREAMING by
 * sentence: as the reply streams in, each finished sentence is synthesized and
 * played immediately (with the next one prefetched while the current plays), so
 * audio starts moments after the first sentence instead of after the whole
 * reply + full synthesis. Vercel-safe — just POSTs to /api/voice/speak.
 *
 * `speaking` is driven by the audio element's own events (playing/pause/ended),
 * so the effects only ever do side effects, never setState.
 */
export function useTtsPlayback(opts: {
  enabled: boolean;
  /** The latest assistant message (or undefined when the last turn is the user's). */
  message: UIMessage | undefined;
  /** True when the reply has finished streaming (status === "ready"). */
  complete: boolean;
  onError?: (message: string | null) => void;
}): UseTtsPlayback {
  const { enabled, message, complete, onError } = opts;

  const [speaking, setSpeaking] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const baselineIdRef = useRef<string | null>(null);
  const latestIdRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const textsRef = useRef<string[]>([]); // sentence queue for the active session
  const producerDoneRef = useRef(false); // reply finished streaming
  const processedLenRef = useRef(0); // chars already turned into sentences
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  });
  useEffect(() => {
    latestIdRef.current = message?.id;
  }, [message?.id]);

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause(); // 'pause' listener flips speaking off
  }, []);

  const endSession = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    textsRef.current = [];
    producerDoneRef.current = false;
    processedLenRef.current = 0;
    sessionIdRef.current = null;
    stopPlayback();
  }, [stopPlayback]);

  const fetchSpeak = useCallback(
    async (sentence: string, signal: AbortSignal): Promise<Blob | null> => {
      try {
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: sentence }),
          signal,
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error?: { message?: string } | null;
          } | null;
          throw new Error(
            json?.error?.message ?? "Couldn't play the spoken reply.",
          );
        }
        return await res.blob();
      } catch (err) {
        if (signal.aborted) return null;
        if (err instanceof DOMException && err.name === "AbortError") return null;
        onErrorRef.current?.(
          err instanceof Error ? err.message : "Couldn't play the spoken reply.",
        );
        return null;
      }
    },
    [],
  );

  const playBlob = useCallback(
    (blob: Blob, signal: AbortSignal): Promise<void> =>
      new Promise<void>((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.addEventListener("playing", () => setSpeaking(true));
        audio.addEventListener("pause", () => setSpeaking(false));
        audio.addEventListener("ended", () => {
          setSpeaking(false);
          finish();
        }, { once: true });
        audio.addEventListener("error", finish, { once: true });
        signal.addEventListener(
          "abort",
          () => {
            audio.pause();
            finish();
          },
          { once: true },
        );
        void audio.play().catch(() => {
          /* error / abort listeners settle the promise */
        });
      }),
    [],
  );

  // Sentence pump: play each sentence in order, prefetching the next while the
  // current one plays. Runs once per session until the reply is fully spoken.
  const drive = useCallback(
    async (signal: AbortSignal) => {
      let idx = 0;
      let prefetch: Promise<Blob | null> | null = null;
      while (!signal.aborted) {
        // Wait for sentence `idx` to arrive (or the reply to finish).
        while (
          textsRef.current.length <= idx &&
          !producerDoneRef.current &&
          !signal.aborted
        ) {
          await sleep(50);
        }
        if (signal.aborted) return;
        if (idx >= textsRef.current.length) break; // done — nothing left

        const current = prefetch ?? fetchSpeak(textsRef.current[idx], signal);
        prefetch = null;
        const blob = await current;
        if (signal.aborted) return;
        // Prefetch the next sentence (if ready) while this one plays.
        if (textsRef.current.length > idx + 1) {
          prefetch = fetchSpeak(textsRef.current[idx + 1], signal);
        }
        if (blob) await playBlob(blob, signal);
        idx++;
      }
    },
    [fetchSpeak, playBlob],
  );

  // Turn newly-streamed text into queued sentences for the active session.
  const feed = useCallback((fullText: string, isComplete: boolean) => {
    const buffer = fullText.slice(processedLenRef.current);
    const { sentences, rest } = splitSentences(buffer);
    for (const s of sentences) {
      const cleaned = cleanForSpeech(s);
      if (cleaned) textsRef.current.push(cleaned);
    }
    processedLenRef.current += buffer.length - rest.length;
    if (isComplete) {
      const tail = cleanForSpeech(rest);
      if (tail) textsRef.current.push(tail);
      processedLenRef.current = fullText.length;
      producerDoneRef.current = true;
    }
  }, []);

  const text =
    enabled && message?.role === "assistant" ? extractText(message) : "";

  // Stop playback + free resources on unmount.
  useEffect(() => () => endSession(), [endSession]);

  // On enable, baseline to the current message so pre-existing history isn't
  // replayed; on disable, stop anything playing.
  useEffect(() => {
    if (!enabled) {
      endSession();
      return;
    }
    baselineIdRef.current = latestIdRef.current ?? null;
  }, [enabled, endSession]);

  // Start a session for each new reply and feed it streamed text.
  useEffect(() => {
    if (!enabled || !message || message.role !== "assistant") return;
    if (message.id === baselineIdRef.current) return;
    if (message.id !== sessionIdRef.current) {
      endSession();
      const ac = new AbortController();
      abortRef.current = ac;
      sessionIdRef.current = message.id;
      feed(text, complete);
      void drive(ac.signal);
    } else {
      feed(text, complete);
    }
  }, [enabled, message, text, complete, drive, feed, endSession]);

  const stop = useCallback(() => {
    baselineIdRef.current = latestIdRef.current ?? null;
    endSession();
  }, [endSession]);

  return { speaking, stop };
}
