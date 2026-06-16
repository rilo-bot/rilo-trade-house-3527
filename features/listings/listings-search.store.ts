import { createStore } from "zustand/vanilla";
import type { SearchResult } from "./listings.repository";

/**
 * Client store for the /properties search. Holds the latest result set fetched
 * from `GET /api/listings` plus loading/error flags, so the filter bar and the
 * results grid read from one source of truth instead of threading props.
 *
 * NOTE: this deliberately holds server data (the listings), which the wider
 * convention (see AGENTS.md / favorites-store.ts) normally keeps OUT of Zustand.
 * It's scoped to the properties page via its own provider — created fresh per
 * mount (factory + Context pattern) so nothing leaks across server requests.
 */
export type ListingsSearchState = {
  result: SearchResult | null;
  loading: boolean;
  /** A "load more" (next page) fetch is in flight — distinct from `loading`. */
  loadingMore: boolean;
  error: string | null;
};

export type ListingsSearchActions = {
  /** Mark a first-page fetch as in-flight. */
  start: () => void;
  /** Store a successful first-page result (clears any error, ends loading). */
  setResult: (result: SearchResult) => void;
  /** Mark a next-page fetch as in-flight. */
  startMore: () => void;
  /** Append a next-page result's items onto the existing list. */
  appendResult: (result: SearchResult) => void;
  /** Store an error message (ends loading). */
  setError: (message: string) => void;
};

export type ListingsSearchStore = ListingsSearchState & ListingsSearchActions;

export const defaultListingsSearchState: ListingsSearchState = {
  result: null,
  loading: true,
  loadingMore: false,
  error: null,
};

export const createListingsSearchStore = (
  initState: ListingsSearchState = defaultListingsSearchState,
) =>
  createStore<ListingsSearchStore>()((set) => ({
    ...initState,
    start: () => set({ loading: true, error: null }),
    setResult: (result) =>
      set({ result, loading: false, loadingMore: false, error: null }),
    startMore: () => set({ loadingMore: true, error: null }),
    appendResult: (result) =>
      set((state) => ({
        // Keep the new page's pagination meta (page/total/totalPages) but
        // append its items onto what we already have.
        result: state.result
          ? { ...result, items: [...state.result.items, ...result.items] }
          : result,
        loadingMore: false,
      })),
    setError: (message) =>
      set({ error: message, loading: false, loadingMore: false }),
  }));
