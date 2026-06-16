"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createAssistantStore,
  type AssistantStore,
} from "@/stores/assistant-store";

type AssistantStoreApi = ReturnType<typeof createAssistantStore>;

const AssistantStoreContext = createContext<AssistantStoreApi | undefined>(
  undefined,
);

/**
 * Provides a single assistant store to the tree below it. The lazy `useState`
 * initializer creates the store exactly once per render tree (per request on
 * the server, once on the client) without recreating it on re-renders.
 */
export function AssistantStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createAssistantStore());

  return (
    <AssistantStoreContext.Provider value={store}>
      {children}
    </AssistantStoreContext.Provider>
  );
}

/**
 * Read from the assistant store with a selector. Select narrowly (e.g.
 * `useAssistantStore((s) => s.open)`) to keep re-renders minimal.
 */
export function useAssistantStore<T>(selector: (store: AssistantStore) => T): T {
  const store = useAssistantStoreApi();
  return useStore(store, selector);
}

/**
 * The raw store API (getState/subscribe). Use this to react to one-shot
 * "events" (a queued prompt from `ask()`) via `subscribe` + a callback, instead
 * of selector + effect — which would mean calling setState synchronously inside
 * an effect body.
 */
export function useAssistantStoreApi() {
  const store = useContext(AssistantStoreContext);
  if (!store) {
    throw new Error(
      "useAssistantStore must be used within an AssistantStoreProvider",
    );
  }
  return store;
}

/**
 * Convenience hook for the common "drive the assistant from a button" case —
 * returns just the imperative actions, so a caller can do
 * `const { ask } = useAssistant(); ask("Is this good value?", { listingId })`.
 */
export function useAssistant() {
  const ask = useAssistantStore((s) => s.ask);
  const prefill = useAssistantStore((s) => s.prefill);
  const openAssistant = useAssistantStore((s) => s.openAssistant);
  const setContext = useAssistantStore((s) => s.setContext);
  return { ask, prefill, openAssistant, setContext };
}
