"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Back navigation control. Uses the browser/router history so it returns to
 * wherever the user came from (search results, dashboard, etc.); falls back to
 * `fallbackHref` when there's no history to go back to (e.g. a deep link).
 */
export function BackButton({
  label = "Back",
  fallbackHref = "/properties",
  className,
}: {
  label?: string;
  fallbackHref?: string;
  className?: string;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      }
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
