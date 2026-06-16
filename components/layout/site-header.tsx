"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { HeaderNav, HeaderNavFallback } from "@/components/layout/header-nav";
import { HeaderUserNav } from "@/components/layout/header-user-nav";
import { MobileNav, MobileNavFallback } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { WishlistNavLink } from "@/components/layout/wishlist-nav-link";

/**
 * App-wide top navigation. Over the home page hero it starts fully transparent
 * and animates to a frosted navy bar once the user scrolls; on every other page
 * (which has no full-bleed hero behind it) it stays solid so the white logo and
 * links remain legible. Text stays `brand-foreground` (white) in both states.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Initial read deferred out of the effect body (avoids a sync setState).
    const id = requestAnimationFrame(onScroll);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Transparent only at the very top of the home page (over the hero image).
  const transparent = isHome && !scrolled;

  return (
    <header
      className={cn(
        "text-brand-foreground sticky top-0 z-50 w-full border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
        transparent
          ? "border-transparent bg-transparent"
          : "bg-blue-950/50 border-white/10 shadow-sm backdrop-blur-lg",
      )}
    >
      <div className="mx-auto flex h-14 max-w-page items-center justify-between gap-3 px-4">
        <Logo className="text-brand-foreground text-lg" />

        {/* Desktop inline nav — animated underline highlights the active tab */}
        <Suspense fallback={<HeaderNavFallback />}>
          <HeaderNav />
        </Suspense>

        <div className="flex items-center gap-1 sm:gap-2">
          <WishlistNavLink variant="icon" />
          <ThemeToggle />
          <HeaderUserNav />
          <Suspense fallback={<MobileNavFallback />}>
            <MobileNav />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
