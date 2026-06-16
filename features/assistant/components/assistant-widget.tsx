"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  type UIMessage,
} from "ai";
import { useChat } from "@ai-sdk/react";
import {
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  Send,
  Sparkles,
  Square,
  SquarePen,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AlertMessage } from "@/components/common/alert-message";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import {
  useAssistantStore,
  useAssistantStoreApi,
} from "@/stores/assistant-store-provider";
import type { AssistantContext } from "@/stores/assistant-store";
import {
  AssistantListingCard,
  type AssistantListing,
} from "./assistant-listing-card";
import {
  AssistantInsightsCard,
  type AssistantInsights,
} from "./assistant-insights-card";
import { AssistantGuide } from "./assistant-guide";
import { AssistantLauncher } from "./assistant-launcher";
import { AssistantMarkdown } from "./assistant-markdown";
import { VoiceRecordButton } from "@/features/voice/components/voice-record-button";
import { useTtsPlayback } from "@/features/voice/hooks/use-tts-playback";
import { useRecordingSupported } from "@/features/voice/hooks/use-recording-supported";

/**
 * Floating, site-wide AI assistant. Talks to the streaming POST /api/assistant
 * (which derives the user + personalises server-side), renders tool results as
 * real listing/insights cards inline, and works for guests and signed-in users.
 *
 * It is DRIVEABLE from anywhere via the shared assistant store: any component
 * can `ask()` / `prefill()` / `openAssistant()` and set page `context` (the
 * listing/suburb in focus), which we forward to the model per send so it can
 * answer "is this good value?" without the user re-typing what "this" is.
 *
 * Hidden on the auth flow and the admin console; a help affordance is noise
 * there. Plain "use client" leaf — closed by default, so it SSRs deterministically.
 */
const HIDE_WIDGET_PREFIXES = ["/auth", "/admin"];

/**
 * Property + auction DETAIL pages are the only place the Ava character appears
 * (she narrates the specific listing/auction). Both are served by the same
 * `/properties/[id]` route — an auction is just a listing whose price is an
 * auction — so a single `/properties/<id>` shape covers both. The `/properties`
 * index (no trailing segment) is NOT a detail page. Everywhere else gets the
 * compact chat launcher instead.
 */
const DETAIL_PAGE_RE = /^\/properties\/[^/]+$/;

/** Conversation survives a refresh within the tab (cleared on "New chat"). */
const STORAGE_KEY = "th-assistant-chat-v1";

const TOOL_LOADING_LABEL: Record<string, string> = {
  searchListings: "Searching listings…",
  getListingDetails: "Fetching the listing…",
  getMarketInsights: "Checking the local market…",
  listLocations: "Looking up locations…",
  getMyAccount: "Checking your account…",
  getMySavedListings: "Loading your saved listings…",
  getMyEnquiries: "Looking up your enquiries…",
  getMySavedSearches: "Reading your saved searches…",
  searchMyListings: "Loading your listings…",
  getMyListingQuota: "Checking your listing limit…",
  getMyReceivedLeads: "Summarising your enquiries…",
};

/** Welcome suggestions tuned to the page the user is on / listing in focus. */
function suggestionsFor(
  pathname: string | null,
  context: AssistantContext | null,
): string[] {
  if (context?.listingId) {
    return [
      "Is this property good value?",
      context.suburb
        ? `What's ${context.suburb} like to live in?`
        : "What's this suburb like to live in?",
      "Show me similar listings",
      "What should I ask the owner?",
    ];
  }
  const p = pathname ?? "";
  if (p.startsWith("/insights")) {
    return [
      "Compare two suburbs for me",
      "Where is rent cheapest right now?",
      "Which suburbs have the most listings?",
      "Explain what these numbers mean",
    ];
  }
  if (p.startsWith("/dashboard") || p.startsWith("/leads")) {
    return [
      "How are my listings performing?",
      "Summarise my recent enquiries",
      "How many active listings can I have?",
      "How do leads work?",
    ];
  }
  if (p.startsWith("/post-property")) {
    return [
      "How do I write a listing that sells?",
      "What price should I list at?",
      "What photos work best?",
      "What details do buyers care about?",
    ];
  }
  if (
    p.startsWith("/properties") ||
    p.startsWith("/buy") ||
    p.startsWith("/rent") ||
    p.startsWith("/flatmates")
  ) {
    return [
      "3-bedroom homes to rent in Auckland",
      "Apartments for sale under $800k",
      "Pet-friendly rentals in Wellington",
      "What's the most affordable suburb right now?",
    ];
  }
  return [
    "3-bedroom homes to rent in Auckland",
    "What's the market like in Ponsonby?",
    "Apartments for sale under $800k",
    "What can you help me with?",
  ];
}

export function AssistantWidget() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Shared store: lets any component open/seed the assistant + set page context.
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);
  const context = useAssistantStore((s) => s.context);
  // Raw API for reacting to one-shot prompt/seed "events" imperatively.
  const storeApi = useAssistantStoreApi();

  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  // Surfaced from the mic button / playback (permission denied, transcribe or
  // synthesis failure, etc.).
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // Voice conversation mode: dictation auto-sends and replies are read aloud.
  const [voiceMode, setVoiceMode] = useState(false);
  const voiceSupported = useRecordingSupported();

  const [transport] = useState(
    () => new DefaultChatTransport({ api: "/api/assistant" }),
  );
  const { messages, sendMessage, setMessages, status, stop, error, clearError } =
    // Throttle UI updates so streamed tokens render in smooth batches rather
    // than a per-token reflow storm (calmer on mobile, more polished).
    useChat({ transport, experimental_throttle: 50 });

  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const prevOpen = useRef(false);
  const hydrated = useRef(false);

  const isBusy = status === "submitted" || status === "streaming";

  // On a property/auction detail page the Ava character is the guide; everywhere
  // else we show the compact chat launcher (bubble + suggestion chips).
  const isDetailPage = !!pathname && DETAIL_PAGE_RE.test(pathname);

  const suggestions = useMemo(
    () => suggestionsFor(pathname, context),
    [pathname, context],
  );

  // Build the page-context payload sent with each message (current path +
  // whatever the active page registered). Empty → omit entirely.
  const buildContext = useCallback((): AssistantContext | undefined => {
    const merged: AssistantContext = { path: pathname ?? undefined, ...context };
    const entries = Object.entries(merged).filter(
      ([, v]) => v != null && v !== "",
    );
    return entries.length ? (Object.fromEntries(entries) as AssistantContext) : undefined;
  }, [pathname, context]);

  const send = useCallback(
    (text: string, opts?: { spoken?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || isBusy) return;
      const base = buildContext();
      // Voice turns flag `spoken` so the model replies in a concise spoken style.
      const ctx = opts?.spoken ? { ...(base ?? {}), spoken: true } : base;
      void sendMessage({ text: trimmed }, ctx ? { body: { context: ctx } } : undefined);
      setInput("");
    },
    [isBusy, buildContext, sendMessage],
  );

  // In voice mode the transcript auto-sends (flagged `spoken`) for a hands-free
  // conversation; otherwise it lands in the composer for review/edit. Either way
  // the text flows through the normal pipeline, inheriting all tools + guardrails.
  const handleTranscript = useCallback(
    (text: string) => {
      if (voiceMode) {
        send(text, { spoken: true });
        return;
      }
      setInput((prev) => (prev ? `${prev.trimEnd()} ${text}` : text));
      inputRef.current?.focus();
    },
    [voiceMode, send],
  );

  // Read newly-completed assistant replies aloud while voice mode is on.
  const lastMessage = messages.length
    ? messages[messages.length - 1]
    : undefined;
  const lastAssistant =
    lastMessage?.role === "assistant" ? lastMessage : undefined;
  const { speaking: ttsSpeaking, stop: stopTts } = useTtsPlayback({
    enabled: voiceMode,
    message: lastAssistant,
    complete: status === "ready",
    onError: setVoiceError,
  });

  // Restore the previous conversation once on mount (client only).
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as UIMessage[];
        if (Array.isArray(saved) && saved.length > 0) setMessages(saved);
      }
    } catch {
      /* ignore corrupt/unavailable storage */
    }
  }, [setMessages]);

  // Persist the conversation as it grows (so a refresh keeps the thread).
  useEffect(() => {
    try {
      if (messages.length > 0) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [messages]);

  // Keep latest send/busy available to the store subscription without
  // re-subscribing on every render (refs are synced in an effect, never during
  // render).
  const isBusyRef = useRef(isBusy);
  const sendRef = useRef(send);
  useEffect(() => {
    isBusyRef.current = isBusy;
    sendRef.current = send;
  });

  // React to one-shot `ask()` / `prefill()` events from anywhere. Using the
  // store's `subscribe` (and setting state in its callback) is the recommended
  // pattern for syncing with an external system — it avoids calling setState
  // synchronously inside an effect body.
  useEffect(() => {
    function flush() {
      const s = storeApi.getState();
      if (!s.open) return;
      if (s.seedText != null) {
        const text = s.seedText;
        s.clearSeedText();
        setInput(text);
        inputRef.current?.focus();
      }
      if (s.pendingPrompt && !isBusyRef.current) {
        const prompt = s.pendingPrompt;
        s.clearPendingPrompt();
        sendRef.current(prompt);
      }
    }
    flush(); // catch anything queued before we subscribed
    return storeApi.subscribe(flush);
  }, [storeApi]);

  // A queued prompt may arrive while a response is still streaming; flush it
  // once the model goes idle again.
  useEffect(() => {
    if (isBusy) return;
    const s = storeApi.getState();
    if (s.open && s.pendingPrompt) {
      const prompt = s.pendingPrompt;
      s.clearPendingPrompt();
      sendRef.current(prompt);
    }
  }, [isBusy, storeApi]);

  // Focus the composer on open; restore focus to the launcher when the desktop
  // panel closes (the mobile Sheet restores focus itself via Radix).
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else if (prevOpen.current && !isMobile) {
      launcherRef.current?.focus();
    }
    prevOpen.current = open;
  }, [open, isMobile]);

  // ⌘K / Ctrl+K toggles the assistant from anywhere — a quick-open affordance.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  // Escape closes the non-modal desktop panel. Listen at the document level so it
  // works even when focus has left the panel (it has no focus trap, by design).
  useEffect(() => {
    if (!open || isMobile) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, isMobile, setOpen]);

  if (HIDE_WIDGET_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function newChat() {
    stop();
    stopTts();
    setMessages([]);
    clearError();
    setInput("");
    setVoiceError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    inputRef.current?.focus();
  }

  const contextChip =
    context?.listingId && context.listingTitle ? (
      <p className="mx-1 inline-flex max-w-full items-center gap-1.5 self-start rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
        <Sparkles className="size-3 shrink-0" />
        <span className="truncate">Asking about: {context.listingTitle}</span>
      </p>
    ) : null;

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Discrete screen-reader status — announces start/finish rather than every
          streamed token (which a live transcript region would do, noisily). */}
      <p className="sr-only" role="status" aria-live="polite">
        {isBusy
          ? "The assistant is responding."
          : status === "ready" && messages.length > 0
            ? "Response ready."
            : ""}
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3">

        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 px-1 py-2">
            {contextChip}
            <p className="text-sm text-muted-foreground">
              Hi! I can search live listings, compare suburbs, and explain the NZ
              market. Try one of these:
            </p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <MessageView
              key={m.id}
              message={m}
              streaming={status === "streaming" && idx === messages.length - 1}
            />
          ))
        )}

        {status === "submitted" && <ThinkingBubble />}

        {error && (
          <AlertMessage variant="error" className="text-xs">
            {friendlyError(error)}{" "}
            <button
              type="button"
              onClick={() => clearError()}
              className="font-medium underline underline-offset-2"
            >
              Dismiss
            </button>
          </AlertMessage>
        )}
      </div>

      {voiceError && (
        <div className="px-3 pt-2">
          <AlertMessage variant="error" className="text-xs">
            {voiceError}{" "}
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="font-medium underline underline-offset-2"
            >
              Dismiss
            </button>
          </AlertMessage>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about properties…"
          aria-label="Message the assistant"
          autoComplete="off"
          // text-base on mobile prevents iOS zoom-on-focus; larger touch height.
          className="h-10 flex-1 text-base sm:h-9 sm:text-sm"
        />
        <VoiceRecordButton
          onTranscript={handleTranscript}
          onError={setVoiceError}
        />
        {isBusy ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => void stop()}
            aria-label="Stop generating"
            className="size-10 shrink-0 sm:size-9"
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
            aria-label="Send message"
            className="size-10 shrink-0 sm:size-9"
          >
            <Send className="size-4" />
          </Button>
        )}
      </form>

      <p className="px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-[10px] text-muted-foreground">
        The assistant can make mistakes — verify details on the listing.
        {voiceSupported &&
          " Voice input and replies are processed by a third-party AI provider."}
      </p>
    </div>
  );

  // Header controls shared between desktop (custom panel) and mobile (sheet).
  const headerActions = (
    <div className="flex items-center gap-0.5">
      {voiceSupported && (
        <Button
          variant={voiceMode ? "default" : "ghost"}
          size="icon-sm"
          aria-label={
            voiceMode ? "Turn off spoken replies" : "Turn on spoken replies"
          }
          aria-pressed={voiceMode}
          title={voiceMode ? "Voice replies on" : "Voice replies off"}
          onClick={() => setVoiceMode((v) => !v)}
          className={cn(voiceMode && ttsSpeaking && "animate-pulse")}
        >
          {voiceMode ? (
            <Volume2 className="size-4" />
          ) : (
            <VolumeX className="size-4" />
          )}
        </Button>
      )}
      {messages.length > 0 && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Start a new chat"
          onClick={newChat}
        >
          <SquarePen className="size-4" />
        </Button>
      )}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={expanded ? "Shrink the assistant" : "Expand the assistant"}
          aria-pressed={expanded}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </Button>
      )}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close assistant"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Closed-state launcher — only when closed, so it can never overlap the
          open panel. Two shapes by page:
          • Detail pages (a property/auction in focus) → the Ava character, who
            narrates THIS listing/auction in a speech bubble + voice. Because she
            sits bottom-right, the explicit "open chat" control lives top-right
            (just below the sticky h-14 header) where she can't cover it.
          • Every other page → a compact chat bubble + suggestion chips.
          Suppressed (no auto-greeting/voice, no chips) once a conversation
          exists so a returning user mid-thread isn't re-prompted. */}
      {!open &&
        (isDetailPage ? (
          <>
            <div className="fixed right-4 bottom-0 z-60 sm:right-10">
              <AssistantGuide suppressed={messages.length > 0} />
            </div>
            <Button
              type="button"
              size="icon"
              onClick={() => setOpen(true)}
              aria-label="Open the Trade House assistant"
              // Track the content gutter: on wide screens the button sits in the
              // right margin beside the max-w-5xl (64rem) content, so it never
              // covers the detail page's sticky price-card actions (share /
              // favourite). Clamps to 1rem on narrow screens (single-column, no
              // right rail to collide with).
              style={{ right: "max(1rem, calc((100vw - 64rem) / 2 - 2.75rem))" }}
              className="fixed top-20 z-60 size-11 rounded-full shadow-lg"
            >
              <MessageCircle className="size-5" />
            </Button>
          </>
        ) : (
          <AssistantLauncher suppressed={messages.length > 0} />
        ))}

      {isMobile ? (
        // Mobile: a full-screen sheet (Radix handles focus trap + Escape + its
        // own close button). Full height so the keyboard never hides the input.
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            // `data-[side=bottom]:h-dvh` overrides the base sheet's
            // `data-[side=bottom]:h-auto` (same variant → tailwind-merge keeps
            // ours; matching specificity wins). Full viewport height + a single
            // bounded scroll area is what makes the message list scrollable on
            // mobile (auto height let it overflow above the screen → "stuck").
            className="flex h-dvh flex-col gap-0 overflow-hidden rounded-none border-0 p-0 data-[side=bottom]:h-dvh"
          >
            <SheetHeader className="border-b border-border px-4 py-3 text-left">
              <SheetTitle className="flex items-center gap-2 font-heading text-base">
                <Sparkles className="size-4 text-primary" />
                Ask Trade House
              </SheetTitle>
              <SheetDescription className="sr-only">
                Ask about NZ properties, suburbs, and the local market.
              </SheetDescription>
            </SheetHeader>
            {/* New-chat sits just left of the Sheet's built-in close (top-3 right-3). */}
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Start a new chat"
                onClick={newChat}
                className="absolute top-3 right-12"
              >
                <SquarePen className="size-4" />
              </Button>
            )}
            {body}
          </SheetContent>
        </Sheet>
      ) : (
        open && (
          <div
            id="assistant-panel"
            role="dialog"
            aria-label="Trade House assistant"
            className={cn(
              "fixed bottom-5 right-5 z-100 flex max-h-[calc(100vh-2.5rem)] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg duration-200 animate-in fade-in-0 slide-in-from-bottom-4",
              expanded
                ? "h-[min(88vh,52rem)] w-[min(92vw,40rem)]"
                : "h-[min(70vh,600px)] w-95",
            )}
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="flex items-center gap-2 font-heading text-sm font-medium text-foreground">
                <Sparkles className="size-4 text-primary" />
                Ask Trade House
              </span>
              {headerActions}
            </header>
            {body}
          </div>
        )
      )}
    </>
  );
}

/** Smooth entrance for any new bubble/card as it appears in the stream. */
const ENTER = "duration-300 animate-in fade-in-0 slide-in-from-bottom-1";

/** One message: a right-aligned bubble for the user, interleaved parts for the assistant. */
function MessageView({
  message,
  streaming,
}: {
  message: UIMessage;
  streaming?: boolean;
}) {
  if (message.role === "user") {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("");
    if (!text) return null;
    return (
      <div className={cn("flex justify-end", ENTER)}>
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }

  // The blinking caret trails the LAST text part while this (latest) message
  // is still streaming — the "AI is typing" cue.
  const lastTextIdx = message.parts.reduce(
    (acc, p, i) => (p.type === "text" ? i : acc),
    -1,
  );

  return (
    <div className="flex flex-col gap-2">
      {message.parts.map((part, i) =>
        renderAssistantPart(part, i, !!streaming && i === lastTextIdx),
      )}
    </div>
  );
}

/** Render a single assistant message part: prose text or a tool result. */
function renderAssistantPart(
  part: UIMessage["parts"][number],
  key: number,
  showCaret = false,
) {
  if (part.type === "text") {
    if (!part.text.trim()) {
      // First tokens not in yet — a lone caret keeps the typing feel alive.
      return showCaret ? (
        <div
          key={key}
          className={cn(
            "w-fit rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground",
            ENTER,
          )}
        >
          <span className="assistant-caret" aria-hidden />
        </div>
      ) : null;
    }
    return (
      <div
        key={key}
        className={cn(
          "max-w-[92%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground",
          ENTER,
        )}
      >
        <AssistantMarkdown>{part.text}</AssistantMarkdown>
        {showCaret && <span className="assistant-caret" aria-hidden />}
      </div>
    );
  }

  if (isToolUIPart(part)) {
    const name = getToolName(part);

    if (part.state === "input-streaming" || part.state === "input-available") {
      return (
        <ToolStatus key={key} label={TOOL_LOADING_LABEL[name] ?? "Working…"} />
      );
    }

    if (part.state === "output-error") {
      return (
        <p key={key} className="text-xs text-destructive">
          Couldn&apos;t complete that lookup. Please try rephrasing.
        </p>
      );
    }

    if (part.state === "output-available") {
      const out = part.output;
      // Tools that return listing cards (key differs per tool).
      const cardArray =
        name === "searchListings" || name === "searchMyListings"
          ? asListingArray((out as { listings?: unknown })?.listings)
          : name === "getMySavedListings"
            ? asListingArray((out as { savedListings?: unknown })?.savedListings)
            : null;
      if (cardArray) {
        if (cardArray.length === 0) return null; // the assistant's text explains
        return (
          <div key={key} className={cn("grid gap-2", ENTER)}>
            {cardArray.map((l) => (
              <AssistantListingCard key={l.id} listing={l} />
            ))}
          </div>
        );
      }
      if (name === "getListingDetails") {
        const listing = asListing(out);
        return listing ? (
          <div key={key} className={ENTER}>
            <AssistantListingCard listing={listing} />
          </div>
        ) : null;
      }
      if (name === "getMarketInsights") {
        const data = asInsights(out);
        return data ? (
          <div key={key} className={ENTER}>
            <AssistantInsightsCard data={data} />
          </div>
        ) : null;
      }
      // getMyAccount / getMyEnquiries / getMySavedSearches / getMyListingQuota /
      // getMyReceivedLeads / listLocations: narrated in text by the assistant.
      return null;
    }
  }

  return null;
}

function ToolStatus({ label }: { label: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 self-start rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground",
        ENTER,
      )}
    >
      <Loader2 className="size-3.5 animate-spin" />
      {label}
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div
      className={cn(
        "flex w-fit items-center gap-1.5 self-start rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3 text-muted-foreground",
        ENTER,
      )}
    >
      <span className="assistant-typing-dot size-1.5 rounded-full bg-current" />
      <span className="assistant-typing-dot size-1.5 rounded-full bg-current" />
      <span className="assistant-typing-dot size-1.5 rounded-full bg-current" />
      <span className="sr-only">The assistant is thinking…</span>
    </div>
  );
}

/** Our API returns the `{ data, error }` envelope; the transport surfaces a
 *  non-OK body as `error.message` (raw text). Parse out the friendly message. */
function friendlyError(err: Error): string {
  try {
    const parsed = JSON.parse(err.message);
    if (parsed?.error?.message) return String(parsed.error.message);
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {
    /* not JSON — fall through */
  }
  return err.message || "Something went wrong. Please try again.";
}

// --- tool output guards (output is `unknown` on the client) ---

function asListingArray(arr: unknown): AssistantListing[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (l): l is AssistantListing =>
      !!l &&
      typeof l === "object" &&
      typeof (l as AssistantListing).id === "string" &&
      typeof (l as AssistantListing).url === "string",
  );
}

function asListing(output: unknown): AssistantListing | null {
  const l = output as AssistantListing | null;
  return l &&
    typeof l === "object" &&
    typeof l.id === "string" &&
    typeof l.url === "string"
    ? l
    : null;
}

function asInsights(output: unknown): AssistantInsights | null {
  const d = output as AssistantInsights | null;
  return d && typeof d === "object" && Array.isArray(d.kpis) ? d : null;
}
