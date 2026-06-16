"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createListingsSearchStore,
  type ListingsSearchStore,
} from "./listings-search.store";

type ListingsSearchStoreApi = ReturnType<typeof createListingsSearchStore>;

const ListingsSearchStoreContext = createContext<
  ListingsSearchStoreApi | undefined
>(undefined);

/**
 * Scopes one listings-search store to the /properties page. Created once per
 * mount via the factory so it never leaks across server requests — same pattern
 * as FavoritesStoreProvider.
 */
export function ListingsSearchStoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [store] = useState(() => createListingsSearchStore());
  return (
    <ListingsSearchStoreContext.Provider value={store}>
      {children}
    </ListingsSearchStoreContext.Provider>
  );
}

/** Read from the listings-search store with a selector (narrow re-renders). */
export function useListingsSearchStore<T>(
  selector: (store: ListingsSearchStore) => T,
): T {
  const store = useContext(ListingsSearchStoreContext);
  if (!store) {
    throw new Error(
      "useListingsSearchStore must be used within a ListingsSearchStoreProvider",
    );
  }
  return useStore(store, selector);
}
