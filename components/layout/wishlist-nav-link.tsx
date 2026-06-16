"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { navLinkClass } from "@/components/layout/header-nav";
import { useFavoritesStore } from "@/stores/favorites-store-provider";

/**
 * Wishlist entry point for the header. A client component because it shows a
 * live saved-count badge sourced from the favorites store. Three variants:
 *  - "icon"    — compact icon button for the header's right-side actions cluster
 *  - "header"  — inline desktop nav link (matches the other header links)
 *  - "mobile"  — full-width row for the hamburger drawer
 */
export function WishlistNavLink({
  variant = "header",
  onNavigate,
}: {
  variant?: "icon" | "header" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const count = useFavoritesStore((s) => s.count);
  const active = pathname === "/wishlist";

  // Heart icon with a count badge pinned to its top-right corner (cart-style).
  // `ringClass` matches the badge's outline to the surrounding background so it
  // reads as a clean separator against either the header or the mobile drawer.
  const heart = (ringClass: string) => (
    <span className="relative inline-flex">
      <Heart className="size-4" />
      {count > 0 ? (
        <span
          className={cn(
            "absolute -top-1.5 -right-1.5 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-none text-white ring-2",
            ringClass,
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </span>
  );

  if (variant === "icon") {
    return (
      <Link
        href="/wishlist"
        aria-label={count > 0 ? `Saved homes (${count})` : "Saved homes"}
        aria-current={active ? "page" : undefined}
        className="text-brand-foreground/80 hover:text-brand-foreground hover:bg-brand-foreground/10 hidden size-9 place-items-center rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand sm:grid"
      >
        {heart("ring-brand")}
      </Link>
    );
  }

  if (variant === "mobile") {
    return (
      <Link
        href="/wishlist"
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "bg-accent text-accent-foreground" : "hover:bg-accent",
        )}
      >
        {heart("ring-background")}
        Wishlist
      </Link>
    );
  }

  return (
    <Link
      href="/wishlist"
      aria-current={active ? "page" : undefined}
      className={cn(navLinkClass(active), "flex items-center gap-1.5")}
    >
      {heart("ring-brand")}
      Wishlist
    </Link>
  );
}
