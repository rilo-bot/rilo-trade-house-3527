"use client";

import { useEffect } from "react";
import { Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceRecorder } from "../hooks/use-voice-recorder";

/**
 * Push-to-talk mic button for the assistant composer. Tap to start listening
 * (pulsing animation); it auto-stops shortly after you finish speaking (or after
 * a few seconds of silence) with a beep, then transcribes and hands the text to
 * `onTranscript`. Tapping again stops immediately. Renders nothing on browsers
 * without recording support.
 *
 * Errors are surfaced to the parent via `onError` so the widget shows them in
 * its existing alert area.
 */
export function VoiceRecordButton({
  onTranscript,
  onError,
  disabled,
  className,
}: {
  onTranscript: (text: string) => void;
  /** Called with the current error message, or null when cleared. */
  onError?: (message: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { status, isSupported, error, toggle } = useVoiceRecorder({
    onTranscript,
  });

  useEffect(() => {
    onError?.(error);
  }, [error, onError]);

  if (!isSupported) return null;

  const listening = status === "recording";
  const transcribing = status === "transcribing";
  const label = listening
    ? "Listening… tap to stop"
    : transcribing
      ? "Transcribing…"
      : "Start voice input";

  return (
    <span className="relative inline-flex shrink-0">
      {/* Listening halo — a soft pulsing ring while the mic is open. */}
      {listening && (
        <span
          aria-hidden
          className="bg-destructive/30 pointer-events-none absolute inset-0 rounded-md motion-safe:animate-ping"
        />
      )}
      <Button
        type="button"
        size="icon"
        variant={listening ? "destructive" : "ghost"}
        onClick={() => {
          onError?.(null);
          toggle();
        }}
        disabled={disabled || transcribing}
        aria-label={label}
        aria-pressed={listening}
        title={label}
        className={cn(
          "relative size-10 sm:size-9",
          listening && "motion-safe:animate-pulse",
          className,
        )}
      >
        {transcribing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Mic className="size-4" />
        )}
        <span className="sr-only" role="status" aria-live="polite">
          {listening ? "Listening" : transcribing ? "Transcribing" : ""}
        </span>
      </Button>
    </span>
  );
}
