"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  usePathname,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import {
  Bell,
  Building2,
  BookOpen,
  ChevronDown,
  Gavel,
  Heart,
  Home,
  KeyRound,
  LineChart,
  ListPlus,
  Route,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig, type NavIcon, type NavMenu, type NavMenuItem } from "@/config/site";

/** Maps a nav config icon key to its lucide component. */
export const NAV_ICONS: Record<NavIcon, ComponentType<{ className?: string }>> = {
  home: Home,
  building: Building2,
  heart: Heart,
  key: KeyRound,
  users: Users,
  book: BookOpen,
  listPlus: ListPlus,
  route: Route,
  shield: ShieldCheck,
  insights: LineChart,
  trending: TrendingUp,
  bell: Bell,
  gavel: Gavel,
};

/**
 * True when a nav href points at the current page. Clean paths (`/buy`,
 * `/insights`) match the pathname; any href that still carries a `?param` must
 * match the live search params too. Hash links (`/#why`) never match — they're
 * scroll anchors, not destinations.
 */
export function isActiveHref(
  href: string,
  pathname: string,
  searchParams: ReadonlyURLSearchParams,
): boolean {
  const [path, query] = href.split("?");
  if (path.includes("#")) return false;
  if (path !== pathname) return false;
  if (!query) return true; // e.g. "/" or "/post-property"
  const params = new URLSearchParams(query);
  for (const [key, value] of params.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

/**
 * Shared nav-link style: an animated underline that wipes in from the left on
 * hover and stays shown when active — no background change. The underline uses
 * `currentColor`, so it adapts to whichever header state (transparent / solid)
 * is active. Reused by the menu triggers and the wishlist link so the whole row
 * is consistent.
 */
export function navLinkClass(active: boolean) {
  return cn(
    "relative py-1 text-sm whitespace-nowrap transition-colors",
    "after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:bg-current after:transition-transform after:duration-300",
    // Keyboard focus indicator (the bar is navy, so the default outline is hard
    // to see): a brand-tinted ring + reveal the underline on focus too.
    "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand focus-visible:after:scale-x-100",
    active
      ? "text-brand-foreground font-medium after:scale-x-100"
      : "text-brand-foreground/70 hover:text-brand-foreground after:scale-x-0 hover:after:scale-x-100",
  );
}

export function HeaderNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Only one menu open at a time. A short close-delay bridges the gap between
  // a trigger and its panel so the menu doesn't flicker shut mid-move.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);

  const clearTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const open = (key: string) => {
    clearTimer();
    setOpenKey(key);
  };
  const scheduleClose = () => {
    clearTimer();
    closeTimer.current = setTimeout(() => setOpenKey(null), 120);
  };
  const closeNow = () => {
    clearTimer();
    setOpenKey(null);
  };

  // Tear down a pending timer on unmount; close on any outside pointer-down
  // (handles touch, where there's no mouse-leave to close the menu).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        clearTimer();
        setOpenKey(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      clearTimer();
      document.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <nav ref={navRef} className="hidden items-center gap-6 sm:flex">
      {siteConfig.nav.map((menu) => {
        // Direct-link items (e.g. "Live auctions") render as a plain link with
        // an optional live dot — no dropdown.
        if (menu.href) {
          const active = isActiveHref(menu.href, pathname, searchParams);
          return (
            <Link
              key={menu.title}
              href={menu.href}
              className={cn(navLinkClass(active), "flex items-center gap-1.5")}
            >
              {menu.live && <LiveDot />}
              {menu.title}
            </Link>
          );
        }
        const active = (menu.items ?? []).some((i) =>
          isActiveHref(i.href, pathname, searchParams),
        );
        return (
          <NavMenuTrigger
            key={menu.title}
            menu={menu}
            active={active}
            isOpen={openKey === menu.title}
            onOpen={() => open(menu.title)}
            onClose={scheduleClose}
            onCloseNow={closeNow}
          />
        );
      })}
    </nav>
  );
}

/** A small pulsing red dot signalling a "live now" nav destination. */
function LiveDot() {
  return (
    <span aria-hidden className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-red-500" />
    </span>
  );
}

/** One top-level menu: an underlined trigger + its mega-menu dropdown panel. */
function NavMenuTrigger({
  menu,
  active,
  isOpen,
  onOpen,
  onClose,
  onCloseNow,
}: {
  menu: NavMenu;
  active: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCloseNow: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = `nav-menu-${menu.title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
      onKeyDown={(e) => {
        // Escape closes and returns focus to the trigger (so keyboard users
        // aren't stranded in a closed panel).
        if (e.key === "Escape") {
          onCloseNow();
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={onOpen}
        onFocus={onOpen}
        className={cn(navLinkClass(active), "flex items-center gap-1")}
      >
        {menu.title}
        <ChevronDown
          className={cn(
            "size-3.5 opacity-70 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 z-50 mt-2 w-80 -translate-x-1/2">
          {/* Invisible bridge over the mt-2 gap keeps hover unbroken. */}
          <div aria-hidden className="absolute -top-2 inset-x-0 h-2" />
          <div
            id={panelId}
            className="bg-card text-card-foreground border-border shadow-soft animate-in fade-in-0 slide-in-from-top-1 rounded-xl border p-2 duration-150"
          >
            {(menu.items ?? []).map((item) => (
              <NavMenuRow
                key={item.title}
                item={item}
                onNavigate={onCloseNow}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** A single mega-menu row: icon tile + title + description (or a "Soon" stub). */
function NavMenuRow({
  item,
  onNavigate,
}: {
  item: NavMenuItem;
  onNavigate: () => void;
}) {
  const Icon = NAV_ICONS[item.icon];

  const body = (
    <>
      <span className="bg-accent text-primary grid size-9 shrink-0 place-items-center rounded-lg">
        <Icon className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {item.title}
          {item.soon && (
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase">
              Soon
            </span>
          )}
        </span>
        <span className="text-muted-foreground text-xs leading-snug">
          {item.description}
        </span>
      </span>
    </>
  );

  if (item.soon) {
    return (
      <div
        aria-disabled
        className="flex cursor-default items-center gap-3 rounded-lg p-2 opacity-60"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="hover:bg-accent focus-visible:bg-accent flex items-center gap-3 rounded-lg p-2 transition-colors outline-none"
    >
      {body}
    </Link>
  );
}

/** Prerender/SSR fallback: closed triggers, no dropdowns until hydration. */
export function HeaderNavFallback() {
  return (
    <nav className="hidden items-center gap-6 sm:flex">
      {siteConfig.nav.map((menu) =>
        menu.href ? (
          <span
            key={menu.title}
            className={cn(navLinkClass(false), "flex items-center gap-1.5")}
          >
            {menu.live && <LiveDot />}
            {menu.title}
          </span>
        ) : (
          <span
            key={menu.title}
            className={cn(navLinkClass(false), "flex items-center gap-1")}
          >
            {menu.title}
            <ChevronDown className="size-3.5 opacity-70" />
          </span>
        ),
      )}
    </nav>
  );
}
