"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { isActiveHref, NAV_ICONS } from "@/components/layout/header-nav";
import { WishlistNavLink } from "@/components/layout/wishlist-nav-link";

/**
 * Hamburger menu shown below the `sm` breakpoint, where the inline header nav
 * is hidden. Opens a drawer with the grouped nav menus as collapsible
 * accordions (native `<details>` — no extra state, accessible by default).
 * Closes on navigation. Uses `useSearchParams`, so it's wrapped in a
 * `<Suspense>` boundary in the header.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="text-brand-foreground hover:bg-brand-foreground/10 grid size-9 place-items-center rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand sm:hidden"
      >
        <Menu className="size-5" />
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-80 max-w-[calc(100vw-3rem)]"
      >
        <SheetHeader>
          <SheetTitle>{siteConfig.name}</SheetTitle>
        </SheetHeader>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4">
          {siteConfig.nav.map((menu) => {
            // Direct-link items (e.g. "Live auctions") render as a flat link
            // with an optional live dot — not a collapsible accordion.
            if (menu.href) {
              const active = isActiveHref(menu.href, pathname, searchParams);
              return (
                <Link
                  key={menu.title}
                  href={menu.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "border-border/60 flex items-center gap-2 rounded-lg border-b px-3 py-3 text-sm font-semibold last:border-0",
                    active && "text-primary",
                  )}
                >
                  {menu.live && (
                    <span aria-hidden className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                    </span>
                  )}
                  {menu.title}
                </Link>
              );
            }
            return (
              <details
                key={menu.title}
                className="group border-border/60 border-b last:border-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  {menu.title}
                  <ChevronDown className="size-4 opacity-60 transition-transform group-open:rotate-180" />
                </summary>

                <div className="flex flex-col gap-0.5 pb-2">
                  {(menu.items ?? []).map((item) => {
                  const Icon = NAV_ICONS[item.icon];
                  if (item.soon) {
                    return (
                      <span
                        key={item.title}
                        aria-disabled
                        className="text-muted-foreground flex items-center gap-2.5 rounded-lg px-3 py-2 pl-4 text-sm"
                      >
                        <Icon className="size-4 opacity-70" />
                        {item.title}
                        <span className="bg-muted ml-auto rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase">
                          Soon
                        </span>
                      </span>
                    );
                  }
                  const active = isActiveHref(item.href, pathname, searchParams);
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 pl-4 text-sm transition-colors",
                        active
                          ? "bg-accent text-accent-foreground font-medium"
                          : "hover:bg-accent",
                      )}
                    >
                      <Icon className="size-4 opacity-70" />
                      {item.title}
                    </Link>
                  );
                  })}
                </div>
              </details>
            );
          })}

          <div className="mt-1">
            <WishlistNavLink
              variant="mobile"
              onNavigate={() => setOpen(false)}
            />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/** Prerender/SSR fallback: the trigger button without the search-param hook. */
export function MobileNavFallback() {
  return (
    <span className="text-brand-foreground grid size-9 place-items-center rounded-lg sm:hidden">
      <Menu className="size-5" />
    </span>
  );
}
