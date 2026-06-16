import { createStore } from "zustand/vanilla";

/**
 * App-wide client state for the wishlist: the set of saved listing ids (so
 * hearts on cards stay in sync) plus the user's TOTAL saved count (for the
 * navbar badge). Both are now seeded from the listings API itself — every
 * `/api/listings` response carries each item's `isFavorite` and the user's
 * `favoritesCount` — so there's no separate favorites fetch on page load.
 *
 * `ids` only ever holds the favorited listings we've actually seen this session
 * (enough to render their hearts); `count` is the authoritative total from the
 * server, adjusted optimistically as the user saves/unsaves.
 *
 * Uses the `createStore` FACTORY + Context-provider pattern (see
 * `stores/favorites-store-provider.tsx`) to avoid leaking state across requests
 * on the server — same convention as `ui-store.ts`.
 */
export type FavoritesState = {
  /** Saved listing ids seen this session. */
  ids: Set<string>;
  /** Authoritative total saved count (drives the navbar badge). */
  count: number;
};

export type FavoritesActions = {
  /** Merge known favorited ids; optionally set the authoritative total count. */
  seed: (ids: string[], count?: number) => void;
  /** Optimistically mark a listing saved (bumps the count). */
  add: (id: string) => void;
  /** Optimistically mark a listing un-saved (drops the count). */
  remove: (id: string) => void;
  /** Clear everything (e.g. on sign-out). */
  reset: () => void;
};

export type FavoritesStore = FavoritesState & FavoritesActions;

export const defaultFavoritesState: FavoritesState = {
  ids: new Set<string>(),
  count: 0,
};

export const createFavoritesStore = (
  initState: FavoritesState = defaultFavoritesState,
) => {
  return createStore<FavoritesStore>()((set) => ({
    ...initState,
    seed: (ids, count) =>
      set((state) => {
        const merged = new Set(state.ids);
        for (const id of ids) merged.add(id);
        return { ids: merged, count: count ?? state.count };
      }),
    add: (id) =>
      set((state) => {
        if (state.ids.has(id)) return state;
        const next = new Set(state.ids);
        next.add(id);
        return { ids: next, count: state.count + 1 };
      }),
    remove: (id) =>
      set((state) => {
        if (!state.ids.has(id)) return state;
        const next = new Set(state.ids);
        next.delete(id);
        return { ids: next, count: Math.max(0, state.count - 1) };
      }),
    reset: () => set({ ids: new Set<string>(), count: 0 }),
  }));
};
