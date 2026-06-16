import Link from "next/link";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/**
 * App brand mark — a gradient icon tile + wordmark. Shared by the header and
 * footer so branding stays identical everywhere. Server Component (no client
 * state). Pass `className` to colour the wordmark for the surface it sits on
 * (e.g. `text-brand-foreground` on the navy header).
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
        "group inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <span className="from-primary to-primary-hover text-primary-foreground grid size-8 shrink-0 place-items-center rounded-lg bg-linear-to-br shadow-sm transition-transform group-hover:scale-105">
        <Home className="size-4" />
      </span>
      <span className="whitespace-nowrap">{siteConfig.name}</span>
    </Link>
  );
}
