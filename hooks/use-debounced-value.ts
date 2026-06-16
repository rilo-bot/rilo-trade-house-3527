"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms have
 * passed without a change. Useful for search inputs, autosave, etc.
 *
 *   const debouncedQuery = useDebouncedValue(query, 300);
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
