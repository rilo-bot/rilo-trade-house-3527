import { createStore } from "zustand/vanilla";

/**
 * App-wide client UI state (example: sidebar open/closed).
 *
 * We use a `createStore` FACTORY rather than a module-level `create()` store.
 * In the App Router a module-level store is shared across requests on the
 * server, which leaks one user's state into another's. The factory lets a
 * Context provider mint one store per request/render tree. See
 * `stores/ui-store-provider.tsx`.
 *
 * Convention:
 *  - App-wide client state lives here in `stores/`.
 *  - State that belongs to a single feature lives in
 *    `features/<feature>/<feature>.store.ts` (same factory + provider pattern).
 *  - Server state (data fetching) is NOT a Zustand concern — fetch in Server
 *    Components or route handlers.
 */

export type UIState = {
  sidebarOpen: boolean;
};

export type UIActions = {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
};

export type UIStore = UIState & UIActions;

export const defaultUIState: UIState = {
  sidebarOpen: false,
};

export const createUIStore = (initState: UIState = defaultUIState) => {
  return createStore<UIStore>()((set) => ({
    ...initState,
    toggleSidebar: () =>
      set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
  }));
};
