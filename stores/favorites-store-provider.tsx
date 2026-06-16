"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { useSession } from "@/lib/auth-client";
import {
  createFavoritesStore,
  type FavoritesStore,
} from "@/stores/favorites-store";

type FavoritesStoreApi = ReturnType<typeof createFavoritesStore>;

const FavoritesStoreContext = createContext<FavoritesStoreApi | undefined>(
  undefined,
);

/**
 * Provides a single favorites store to the tree. The saved ids + total count are
 * seeded from the listings API itself (each `/api/listings` response carries
 * `isFavorite` per item and the user's `favoritesCount`), so there's NO separate
 * favorites fetch here. This provider only mints the store and clears it on
 * sign-out so one user's wishlist never bleeds into the next session.
 */
export function FavoritesStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createFavoritesStore());
  const { data } = useSession();
  const userId = data?.user?.id ?? null;

  useEffect(() => {
    // On sign-out (or before sign-in), drop any saved state.
    if (!userId) store.getState().reset();
  }, [userId, store]);

  return (
    <FavoritesStoreContext.Provider value={store}>
      {children}
    </FavoritesStoreContext.Provider>
  );
}

/** Read from the favorites store with a selector (keeps re-renders narrow). */
export function useFavoritesStore<T>(
  selector: (store: FavoritesStore) => T,
): T {
  const store = useContext(FavoritesStoreContext);
  if (!store) {
    throw new Error(
      "useFavoritesStore must be used within a FavoritesStoreProvider",
    );
  }
  return useStore(store, selector);
}
