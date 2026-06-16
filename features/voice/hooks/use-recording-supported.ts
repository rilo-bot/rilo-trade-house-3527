"use client";

import { useSyncExternalStore } from "react";

/** Whether this browser can capture + record from the mic. */
function recordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

// Support never changes after load, so the store needs no real subscription.
const noopSubscribe = () => () => {};

/**
 * SSR-safe capability read (server snapshot is `false`, so there's no hydration
 * mismatch and voice UI only appears once the client confirms support). Matches
 * the codebase's `useSyncExternalStore` pattern in `hooks/use-media-query`.
 */
export function useRecordingSupported(): boolean {
  return useSyncExternalStore(noopSubscribe, recordingSupported, () => false);
}
