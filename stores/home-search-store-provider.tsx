"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createHomeSearchStore,
  type HomeSearchStore,
} from "@/stores/home-search-store";

type HomeSearchStoreApi = ReturnType<typeof createHomeSearchStore>;

const HomeSearchStoreContext = createContext<HomeSearchStoreApi | undefined>(
  undefined,
);

/**
 * Provides a single home-search store to the tree below it. Wrap the home page
 * so the hero search bar and the Featured properties grid share one instance.
 * The lazy `useState` initializer mints the store once per render tree.
 */
export function HomeSearchStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createHomeSearchStore());

  return (
    <HomeSearchStoreContext.Provider value={store}>
      {children}
    </HomeSearchStoreContext.Provider>
  );
}

/** Read from the home-search store with a selector (keeps re-renders narrow). */
export function useHomeSearchStore<T>(
  selector: (store: HomeSearchStore) => T,
): T {
  const store = useContext(HomeSearchStoreContext);
  if (!store) {
    throw new Error(
      "useHomeSearchStore must be used within a HomeSearchStoreProvider",
    );
  }
  return useStore(store, selector);
}
