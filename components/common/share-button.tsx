"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Share control. Uses the native share sheet (`navigator.share`) when available
 * — phones, and some desktop browsers — and otherwise copies the link to the
 * clipboard, briefly showing a tick as confirmation.
 *
 * `url` defaults to the current page (resolved at click time), so on a listing
 * detail page it shares that listing. A root-relative `url` (e.g.
 * "/properties/123") is resolved against the current origin — handy on cards
 * that know the listing path but not the full URL. The click stops propagation
 * so it's safe to drop inside a card-level <Link>.
 */
export function ShareButton({
  title,
  text,
  url,
  label = "Share",
  className,
}: {
  title: string;
  text?: string;
  url?: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let shareUrl = url ?? window.location.href;
    // Resolve a root-relative path against the current origin.
    if (shareUrl.startsWith("/")) shareUrl = window.location.origin + shareUrl;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — silently ignore.
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={copied ? "Link copied" : label}
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-muted grid size-9 place-items-center rounded-full border border-border bg-background/90 shadow-sm backdrop-blur transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      {copied ? (
        <Check className="size-4 text-emerald-600" />
      ) : (
        <Share2 className="size-4" />
      )}
    </button>
  );
}
