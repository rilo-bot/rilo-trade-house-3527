"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, LogOut, LayoutDashboard, MessageSquare, User } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { isRole } from "@/lib/auth-permissions";
import { UserRole } from "@/lib/enums";
import { Button } from "@/components/ui/button";

/**
 * Auth-aware portion of the site header. Uses the client session so it updates
 * immediately on sign-in / sign-out without a full reload.
 */
export function HeaderUserNav() {
  const router = useRouter();
  const { data, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and returns focus to the trigger.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (isPending) {
    return <div className="size-8 animate-pulse rounded-full bg-brand-foreground/20" />;
  }

  if (!data?.user) {
    // Single auth entry point — the signup page links to sign-in for returnees.
    return (
      <Button asChild size="sm">
        <Link href="/auth/signup">Sign up</Link>
      </Button>
    );
  }

  const user = data.user as typeof data.user & { role?: string };
  const role = isRole(user.role) ? user.role : UserRole.Seeker;
  const canDashboard =
    role === UserRole.Owner || role === UserRole.Agent || role === UserRole.Admin;
  const label = user.name || user.email;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // Always clear the spinner and close the menu — even if the request
      // rejects — so the "Sign out" row can't stay stuck on a loader until a
      // manual page reload.
      setSigningOut(false);
      setOpen(false);
    }
    router.push("/");
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full text-sm text-brand-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? "user-menu" : undefined}
        aria-label="Account menu"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-foreground/15 text-xs font-semibold uppercase">
          {label.slice(0, 2)}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{label}</span>
        <ChevronDown className="size-4 opacity-70" />
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            id="user-menu"
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-card py-1 text-card-foreground shadow-soft"
          >
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium">{user.name || "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            {canDashboard && (
              <MenuLink href="/dashboard" onClick={() => setOpen(false)} icon={LayoutDashboard}>
                Dashboard
              </MenuLink>
            )}
            {canDashboard && (
              <MenuLink href="/dashboard/leads" onClick={() => setOpen(false)} icon={MessageSquare}>
                Leads
              </MenuLink>
            )}
            {role === UserRole.Admin && (
              <MenuLink href="/admin" onClick={() => setOpen(false)} icon={LayoutDashboard}>
                Admin panel
              </MenuLink>
            )}
            <MenuLink href="/enquiries" onClick={() => setOpen(false)} icon={MessageSquare}>
              My enquiries
            </MenuLink>
            <MenuLink href="/account" onClick={() => setOpen(false)} icon={User}>
              My account
            </MenuLink>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive outline-none hover:bg-muted focus-visible:bg-muted"
            >
              {signingOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  icon: Icon,
  children,
}: {
  href: string;
  onClick: () => void;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm outline-none hover:bg-muted focus-visible:bg-muted"
    >
      <Icon className="size-4 opacity-70" />
      {children}
    </Link>
  );
}
