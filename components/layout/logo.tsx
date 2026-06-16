import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * App brand mark — a pure typographic wordmark in Bricolage Grotesque.
 * No icon tile; just clean, elegant display-font text. Shared by the header
 * and footer so branding stays identical everywhere. Server Component (no
 * client state). Pass `className` to tint the wordmark for the surface it
 * sits on (e.g. `text-white` on the navy header).
 */
export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center font-display tracking-tight transition-opacity hover:opacity-80",
        className,
      )}
    >
      <span className="font-medium">Trade</span>
      <span className="font-bold">House</span>
    </Link>
  );
}
