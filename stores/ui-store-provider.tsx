"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createUIStore, type UIStore } from "@/stores/ui-store";

type UIStoreApi = ReturnType<typeof createUIStore>;

const UIStoreContext = createContext<UIStoreApi | undefined>(undefined);

/**
 * Provides a single UI store instance to the tree below it. The lazy
 * `useState` initializer creates the store exactly once per render tree (per
 * request on the server, once on the client) without recreating it on
 * re-renders.
 */
export function UIStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createUIStore());

  return (
    <UIStoreContext.Provider value={store}>{children}</UIStoreContext.Provider>
  );
}

/**
 * Read from the UI store with a selector. Selecting narrowly (e.g.
 * `useUIStore((s) => s.sidebarOpen)`) keeps re-renders minimal.
 */
export function useUIStore<T>(selector: (store: UIStore) => T): T {
  const store = useContext(UIStoreContext);
  if (!store) {
    throw new Error("useUIStore must be used within a UIStoreProvider");
  }
  return useStore(store, selector);
}
