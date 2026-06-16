import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * App brand mark — a pure typographic wordmark in Bricolage Grotesque.
 * No icon tile; just clean, elegant display-font text. Shared by the header
 * and footer so branding stays identical everywhere. Server Component (no
 * client state).
 *
 * Props:
 *   className       — passed to the wrapping <a>. Use `text-white` on dark
 *                     surfaces (the navy header) or leave unset for dark text.
 *   accentClassName — override the accent colour for "House" + the mid-dot.
 *                     Defaults to `text-primary` (blue-600).
 *   dotClassName    — override the mid-dot colour independently. Falls back to
 *                     accentClassName when not set.
 *
 * Design: "Trade" in light weight + a sky-blue mid-dot separator + "House" in
 * extrabold. The mid-dot gives the mark a distinctive, icon-free break with
 * strong visual rhythm — no imagery, just confident typography.
 */
export function Logo({
  className,
  accentClassName,
  dotClassName,
  href = "/",
}: {
  className?: string;
  accentClassName?: string;
  dotClassName?: string;
  href?: string;
}) {
  const accent = accentClassName ?? "text-primary";
  const dot = dotClassName ?? accent;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-baseline gap-px font-display tracking-tight transition-opacity hover:opacity-80",
        className,
      )}
    >
      <span className="font-light">Trade</span>
      <span aria-hidden className={cn("mx-[0.18em] select-none font-bold", dot)}>
        ·
      </span>
      <span className={cn("font-extrabold", accent)}>House</span>
    </Link>
  );
}
