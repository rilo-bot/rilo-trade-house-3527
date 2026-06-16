"use client";

import { useCallback, useState } from "react";
import { buildListingParams, type FilterValues } from "./listing-filters";

/**
 * Holds the filter state for a search surface (the homepage advanced panel or the
 * `/properties` filter bar). Keeps a single `values` object so the param builder
 * has the complete picture, and exposes `patch`/`reset`/`toParams`. Consumers
 * decide WHEN to act on a change (the results page applies instantly; the hero
 * collects and submits on "Search").
 */
export function useListingFilters(initial: FilterValues) {
  const [values, setValues] = useState<FilterValues>(initial);

  const patch = useCallback((p: Partial<FilterValues>) => {
    setValues((prev) => ({ ...prev, ...p }));
  }, []);

  // Clear refinements but keep the current listing-type tab.
  const reset = useCallback(() => {
    setValues((prev) => ({ listingType: prev.listingType, sort: "newest" }));
  }, []);

  const toParams = useCallback(() => buildListingParams(values), [values]);

  return { values, patch, reset, toParams } as const;
}
