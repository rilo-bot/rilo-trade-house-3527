"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecorderStatus } from "../types";
import { useRecordingSupported } from "./use-recording-supported";

/** Hard cap — a dictation clip is short; this bounds cost + upload regardless. */
const MAX_RECORDING_MS = 60_000;
/** Stop + transcribe this long after the user stops speaking (snappy end-of-turn). */
const END_SILENCE_MS = 2_000;
/** Auto-cancel (no transcription) if the user never speaks after starting. */
const NO_SPEECH_TIMEOUT_MS = 5_000;
/** Normalized RMS above this counts as speech. Tunable for noisy environments. */
const SPEECH_RMS_THRESHOLD = 0.015;
/** How often the mic level is sampled for silence detection. */
const MONITOR_INTERVAL_MS = 100;
/** FFT size for the analyser — small is plenty for an amplitude (RMS) read. */
const ANALYSER_FFT_SIZE = 512;

/** Preferred MediaRecorder containers, best-supported first. */
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

/** Short confirmation beep when listening auto-stops. Self-contained, no asset. */
function playBeep(): void {
  const Ctx = typeof window !== "undefined" ? window.AudioContext : undefined;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 660;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
    osc.onended = () => void ctx.close();
  } catch {
    /* audio output unavailable — beep is non-essential */
  }
}

export interface UseVoiceRecorder {
  status: RecorderStatus;
  /** True only once the browser confirms recording support (client). */
  isSupported: boolean;
  error: string | null;
  /** Start listening, or stop-and-transcribe if already listening. */
  toggle: () => void;
  /** Stop listening and transcribe (no-op unless listening). */
  stop: () => void;
  clearError: () => void;
}

/**
 * Push-to-talk voice capture with silence detection. Click to start: the hook
 * listens, watches the mic level, and auto-stops ~2s after you finish speaking
 * (or after 5s if you never speak), plays a short beep, then transcribes via
 * `/api/voice/transcribe` and hands the text to `onTranscript`. No stop button —
 * speaking and pausing drives it. Clicking again stops immediately.
 *
 * SSR-safe: capability detection uses `useSyncExternalStore`, never setState in
 * an effect.
 */
export function useVoiceRecorder(opts: {
  onTranscript: (text: string) => void;
}): UseVoiceRecorder {
  const { onTranscript } = opts;

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const isSupported = useRecordingSupported();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether the captured audio should be transcribed (false = silent cancel).
  const shouldTranscribeRef = useRef(true);
  // Latest callback without re-binding recorder handlers each render.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  // Tear down the capture graph + free the mic. No setState (safe in effects).
  const cleanupCapture = useCallback(() => {
    if (monitorRef.current) {
      clearInterval(monitorRef.current);
      monitorRef.current = null;
    }
    if (maxStopRef.current) {
      clearTimeout(maxStopRef.current);
      maxStopRef.current = null;
    }
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        /* already stopped */
      }
      cleanupCapture();
    };
  }, [cleanupCapture]);

  const transcribe = useCallback(async (blob: Blob) => {
    setStatus("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "clip");
      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { text?: string } | null;
        error?: { message?: string } | null;
      } | null;

      if (!res.ok || json?.error) {
        throw new Error(
          json?.error?.message ?? "Couldn't transcribe that. Please try again.",
        );
      }

      const text = json?.data?.text?.trim() ?? "";
      if (!text) setError("Didn't catch that — try speaking again.");
      else onTranscriptRef.current(text);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't transcribe that. Please try again.",
      );
    } finally {
      setStatus("idle");
    }
  }, []);

  // Stop the active recorder. `transcribeAfter` decides whether onstop processes
  // the audio; `beep` plays the confirmation tone (for auto-stops, not manual).
  const finishRecording = useCallback(
    (transcribeAfter: boolean, beep: boolean) => {
      const rec = recorderRef.current;
      if (!rec || rec.state !== "recording") return;
      // Stop the monitor immediately so it can't fire twice.
      if (monitorRef.current) {
        clearInterval(monitorRef.current);
        monitorRef.current = null;
      }
      if (maxStopRef.current) {
        clearTimeout(maxStopRef.current);
        maxStopRef.current = null;
      }
      shouldTranscribeRef.current = transcribeAfter;
      if (beep) playBeep();
      rec.stop(); // → recorder.onstop
    },
    [],
  );

  const start = useCallback(async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      setError(
        "Microphone access was blocked. Enable it in your browser settings to use voice.",
      );
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    shouldTranscribeRef.current = true;

    // Silence-detection graph (analyser only — never connected to output).
    let analyser: AnalyserNode | null = null;
    const Ctx = typeof window !== "undefined" ? window.AudioContext : undefined;
    if (Ctx) {
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const node = ctx.createAnalyser();
      node.fftSize = ANALYSER_FFT_SIZE;
      source.connect(node);
      audioCtxRef.current = ctx;
      analyser = node;
    }

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined,
    );
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const transcribeAfter = shouldTranscribeRef.current;
      const type = recorder.mimeType || mimeType || "audio/webm";
      cleanupCapture();
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      if (transcribeAfter && blob.size > 0) void transcribe(blob);
      else setStatus("idle");
    };

    recorder.start();
    setStatus("recording");

    // Safety cap regardless of silence detection.
    maxStopRef.current = setTimeout(
      () => finishRecording(true, true),
      MAX_RECORDING_MS,
    );

    // Drive auto-stop from the mic level. If there's no AudioContext, the clip
    // simply runs to the max cap or a manual tap.
    if (analyser) {
      const liveAnalyser = analyser; // const keeps the non-null narrowing in the closure
      const samples = new Float32Array(liveAnalyser.fftSize);
      const startedAt = Date.now();
      let hasSpoken = false;
      let lastSpeechAt = startedAt;
      monitorRef.current = setInterval(() => {
        liveAnalyser.getFloatTimeDomainData(samples);
        let sumSquares = 0;
        for (let i = 0; i < samples.length; i++) {
          sumSquares += samples[i] * samples[i];
        }
        const rms = Math.sqrt(sumSquares / samples.length);
        const now = Date.now();

        if (rms > SPEECH_RMS_THRESHOLD) {
          hasSpoken = true;
          lastSpeechAt = now;
          return;
        }
        if (hasSpoken) {
          if (now - lastSpeechAt >= END_SILENCE_MS) finishRecording(true, true);
        } else if (now - startedAt >= NO_SPEECH_TIMEOUT_MS) {
          finishRecording(false, true);
        }
      }, MONITOR_INTERVAL_MS);
    }
  }, [cleanupCapture, finishRecording, transcribe]);

  const stop = useCallback(
    () => finishRecording(true, false),
    [finishRecording],
  );

  const toggle = useCallback(() => {
    if (status === "recording") finishRecording(true, false);
    else if (status === "idle") void start();
    // ignore while "transcribing"
  }, [status, start, finishRecording]);

  const clearError = useCallback(() => setError(null), []);

  return { status, isSupported, error, toggle, stop, clearError };
}
