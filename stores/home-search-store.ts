import { createStore } from "zustand/vanilla";

/**
 * Home-page search state. Bridges the hero search bar (which writes the chosen
 * filters) and the Featured properties grid (which reads them and re-fetches).
 * This lets a search filter the home page in place — no navigation to
 * `/properties` — even though the two components sit far apart in the tree.
 *
 * Holds only the URL query STRING (client UI state); the listings themselves
 * are server data fetched by the grid via the API. Scoped to the home page by
 * `HomeSearchStoreProvider` (see stores/home-search-store-provider.tsx).
 */

export type HomeSearchState = {
  /** Query string applied to the featured grid, e.g. "listingType=sale&q=foo". */
  query: string;
  /** True once the user has run a search — switches the grid into results mode. */
  active: boolean;
};

export type HomeSearchActions = {
  /** Apply a search; empty string clears it. */
  setQuery: (query: string) => void;
  /** Clear the search and return the grid to the latest-listings view. */
  reset: () => void;
};

export type HomeSearchStore = HomeSearchState & HomeSearchActions;

export const defaultHomeSearchState: HomeSearchState = {
  query: "",
  active: false,
};

export const createHomeSearchStore = (
  initState: HomeSearchState = defaultHomeSearchState,
) => {
  return createStore<HomeSearchStore>()((set) => ({
    ...initState,
    setQuery: (query) => set({ query, active: query.length > 0 }),
    reset: () => set({ query: "", active: false }),
  }));
};
