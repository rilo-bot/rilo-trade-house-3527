"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after the component has mounted on the client. Use to gate
 * client-only UI (e.g. portals, values from `localStorage`) and avoid
 * hydration mismatches. Implemented with `useSyncExternalStore` so the
 * server snapshot is `false` and the client snapshot is `true`.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
