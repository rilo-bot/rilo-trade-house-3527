import type { LucideIcon } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { cn } from "@/lib/utils";

/**
 * Standard page header for workspace / account pages (dashboard, wishlist,
 * enquiries, account, post-property, admin). A gradient icon tile + a
 * `font-display` title + subtitle, with an optional right-aligned action.
 *
 * Distinct from `PageHeader` (components/common/page-header.tsx), which renders
 * the marketing `bg-accent` band used on the public browse pages — workspace
 * pages keep their header aligned to the content column, no full-width band.
 *
 * Presentational + Server-Component-safe: it wraps itself in <Reveal> for the
 * fade-up, but children are passed as props so the page stays a server component.
 */

type Accent = "primary" | "emerald" | "amber" | "violet" | "rose" | "slate";

const ACCENT_TILE: Record<Accent, string> = {
  primary: "from-primary to-primary-hover",
  emerald: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  violet: "from-violet-500 to-violet-600",
  rose: "from-rose-500 to-red-600",
  slate: "from-slate-600 to-slate-800",
};

export function WorkspaceHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  accent = "primary",
  iconClassName,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  /** Right-aligned action (e.g. a button), stacks below the title on mobile. */
  action?: React.ReactNode;
  accent?: Accent;
  /** Extra classes for the icon itself (e.g. `fill-current`). */
  iconClassName?: string;
  className?: string;
}) {
  return (
    <Reveal>
      <header
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <div className="flex items-center gap-3.5">
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-white shadow-sm",
              ACCENT_TILE[accent],
            )}
          >
            <Icon className={cn("size-6", iconClassName)} />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
    </Reveal>
  );
}
