"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Persists state to `localStorage`, JSON-serialized, and stays in sync across
 * tabs/components. SSR-safe via `useSyncExternalStore` (server snapshot falls
 * back to `initialValue`). The setter accepts a value or an updater, like
 * `useState`.
 *
 *   const [theme, setTheme] = useLocalStorage("theme", "system");
 *
 * `localStorage` only fires native `storage` events in OTHER tabs, so we
 * dispatch one ourselves after writing to update the current tab too.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  }, []);

  // Return the raw string so the snapshot stays referentially stable
  // (parsing here would return a new object each call and loop forever).
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);

  let value: T = initialValue;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = initialValue;
    }
  }

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      try {
        const item = window.localStorage.getItem(key);
        const prev: T =
          item !== null ? (JSON.parse(item) as T) : initialValue;
        const valueToStore = next instanceof Function ? next(prev) : next;
        const serialized = JSON.stringify(valueToStore);

        window.localStorage.setItem(key, serialized);
        // Notify subscribers in this tab (native event only fires cross-tab).
        window.dispatchEvent(
          new StorageEvent("storage", { key, newValue: serialized }),
        );
      } catch {
        // Ignore write errors (quota exceeded / private mode / bad JSON).
      }
    },
    [key, initialValue],
  );

  return [value, setValue] as const;
}
