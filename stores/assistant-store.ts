import { createStore } from "zustand/vanilla";

/**
 * App-wide client state for the AI assistant widget.
 *
 * The widget is mounted once (site-wide, in the root layout) but needs to be
 * DRIVEABLE from anywhere — a "Ask AI about this property" button on a listing
 * page, an empty-state CTA, a guideline chip, etc. This store is the bridge:
 * any client component can `openAssistant()`, queue a prompt with `ask()`, or
 * prefill the composer with `prefill()`, and the widget reacts.
 *
 * It also carries the user's current PAGE CONTEXT (what they're looking at), so
 * the widget can forward it to the model and the assistant can answer "is this
 * good value?" without the user re-typing which listing they mean.
 *
 * Factory + Context-provider pattern (see `stores/assistant-store-provider.tsx`)
 * — never a module-level `create()` store, which would leak state across
 * requests on the server.
 */

/** What the user is currently looking at — forwarded to the model per send. */
export type AssistantContext = {
  /** The current route, e.g. "/properties/abc123". */
  path?: string;
  /** A specific listing in focus (detail page / card action). */
  listingId?: string;
  listingTitle?: string;
  /** A suburb/region in focus (insights page, search). */
  suburb?: string;
  region?: string;
  /** True when the listing in focus is an auction — drives the auction-guide
   *  persona (timing, unconditional sales, bidding) vs the property persona. */
  isAuction?: boolean;
  /** Short free-text hint about the surface, e.g. "viewing a listing". */
  label?: string;
  /** Voice turn — ask the model to reply in a concise, spoken style. */
  spoken?: boolean;
};

export type AssistantState = {
  /** Whether the panel/sheet is open. */
  open: boolean;
  /** A prompt queued to auto-send once the widget is open (one-shot). */
  pendingPrompt: string | null;
  /** Text to drop into the composer without sending (one-shot). */
  seedText: string | null;
  /** The user's current page context (set by pages/entry points). */
  context: AssistantContext | null;
};

export type AssistantActions = {
  setOpen: (open: boolean) => void;
  /** Just open the panel (e.g. a launcher or a "?" affordance). */
  openAssistant: () => void;
  /** Open the panel and auto-send `prompt`, optionally with one-shot context. */
  ask: (prompt: string, context?: AssistantContext) => void;
  /** Open the panel and prefill the composer (user edits + sends themselves). */
  prefill: (text: string, context?: AssistantContext) => void;
  /** Register ambient page context; pass null to clear on unmount. */
  setContext: (context: AssistantContext | null) => void;
  /** Widget calls these after consuming the one-shot fields. */
  clearPendingPrompt: () => void;
  clearSeedText: () => void;
};

export type AssistantStore = AssistantState & AssistantActions;

export const defaultAssistantState: AssistantState = {
  open: false,
  pendingPrompt: null,
  seedText: null,
  context: null,
};

export const createAssistantStore = (
  initState: AssistantState = defaultAssistantState,
) => {
  return createStore<AssistantStore>()((set) => ({
    ...initState,
    setOpen: (open) => set({ open }),
    openAssistant: () => set({ open: true }),
    ask: (prompt, context) =>
      set((state) => ({
        open: true,
        pendingPrompt: prompt,
        // explicit context on `ask` wins; otherwise keep ambient context
        context: context ?? state.context,
      })),
    prefill: (text, context) =>
      set((state) => ({
        open: true,
        seedText: text,
        context: context ?? state.context,
      })),
    setContext: (context) => set({ context }),
    clearPendingPrompt: () => set({ pendingPrompt: null }),
    clearSeedText: () => set({ seedText: null }),
  }));
};
