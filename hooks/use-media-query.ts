"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tracks whether a CSS media query currently matches. SSR-safe: the server
 * snapshot is `false`, and the client subscribes to `matchMedia` changes via
 * `useSyncExternalStore` (no setState-in-effect, no extra render).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `md` breakpoint is 768px; below that we treat the view as mobile. */
const MOBILE_BREAKPOINT = 768;

/** Convenience wrapper: true when the viewport is below the mobile breakpoint. */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}
