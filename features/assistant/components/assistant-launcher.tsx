"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { useAssistant } from "@/stores/assistant-store-provider";

/**
 * Compact chat launcher for every page EXCEPT property/auction detail pages
 * (those get the Ava character instead). A round chat-bubble button anchored
 * bottom-right, with three small, page-aware suggestion chips that gently bob
 * above it: tap a chip to open the assistant with that question already asked,
 * or tap the bubble to just open it.
 *
 * Chips render only after mount (SSR-safe, no flash) and are hidden once a
 * conversation already exists (`suppressed`) so a returning user isn't
 * re-prompted. The outer container is click-through; only the chips + bubble
 * are interactive.
 */

/** Three short, page-tuned starter prompts shown as floating chips. */
function launcherHints(pathname: string | null): string[] {
  const p = pathname ?? "";
  if (p.startsWith("/insights")) {
    return ["Compare two suburbs", "Where is rent cheapest?", "Explain these numbers"];
  }
  if (p.startsWith("/dashboard") || p.startsWith("/leads")) {
    return ["How are my listings doing?", "Summarise my enquiries", "How do leads work?"];
  }
  if (p.startsWith("/post-property")) {
    return [
      "What price should I list at?",
      "What photos work best?",
      "Write a listing that sells",
    ];
  }
  if (p.startsWith("/auctions")) {
    return ["How do auctions work?", "What does unconditional mean?", "Show upcoming auctions"];
  }
  if (
    p.startsWith("/properties") ||
    p.startsWith("/buy") ||
    p.startsWith("/rent") ||
    p.startsWith("/flatmates")
  ) {
    return ["3-bed rentals in Auckland", "Apartments under $800k", "Most affordable suburb?"];
  }
  return ["Find me a home to rent", "What's Ponsonby like?", "What can you do?"];
}

export function AssistantLauncher({ suppressed = false }: { suppressed?: boolean }) {
  const pathname = usePathname();
  const mounted = useMounted();
  const { ask, openAssistant } = useAssistant();

  const hints = launcherHints(pathname);
  const showHints = mounted && !suppressed;

  return (
    <div className="pointer-events-none fixed right-4 bottom-5 z-60 flex flex-col items-end gap-2">
      {showHints && (
        <div className="flex max-w-[min(18rem,calc(100vw-2rem))] flex-col items-end gap-1.5">
          {hints.map((hint, i) => (
            <button
              key={hint}
              type="button"
              onClick={() => ask(hint)}
              style={{ "--hint-delay": `${i * 600}ms` } as CSSProperties}
              className="assistant-hint pointer-events-auto max-w-full truncate rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground shadow-md transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground"
            >
              {hint}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={openAssistant}
        aria-label="Open the Trade House assistant"
        className="pointer-events-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageCircle className="size-6" />
      </button>
    </div>
  );
}
