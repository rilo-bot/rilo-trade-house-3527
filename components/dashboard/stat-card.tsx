import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Engagement stat tile for the owner dashboard — a gradient icon, a big metric,
 * a caption, and optional extras (a "new" pill, a usage bar, a manage link).
 * Presentational + Server-Component-safe (no client state); wrap in <Reveal>
 * at the call site for the staggered fade-up.
 */

type Accent = "primary" | "emerald" | "amber" | "violet";

const ACCENT_TILE: Record<Accent, string> = {
  primary: "from-primary to-primary-hover",
  emerald: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  violet: "from-violet-500 to-violet-600",
};

const ACCENT_BAR: Record<Accent, string> = {
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  violet: "bg-violet-500",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  pill,
  progress,
  href,
  cta,
  accent = "primary",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  /** Secondary line under the value (e.g. "3 active"). */
  hint?: React.ReactNode;
  /** Small emphasised pill in the top-right (e.g. "2 new"). */
  pill?: React.ReactNode;
  /** Renders a usage bar (e.g. active listing slots used). */
  progress?: { value: number; max: number };
  href?: string;
  cta?: string;
  accent?: Accent;
  className?: string;
}) {
  const pct = progress
    ? Math.min(100, Math.round((progress.value / Math.max(1, progress.max)) * 100))
    : 0;

  return (
    <div
      className={cn(
        "border-border bg-card shadow-soft group flex h-full flex-col gap-4 rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "text-primary-foreground grid size-11 place-items-center rounded-xl bg-linear-to-br shadow-sm",
            ACCENT_TILE[accent],
          )}
        >
          <Icon className="size-5" />
        </span>
        {pill ? (
          <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-semibold">
            {pill}
          </span>
        ) : null}
      </div>

      <div>
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-muted-foreground mt-0.5 text-sm">{label}</p>
        {hint ? (
          <p className="text-muted-foreground/80 mt-1 text-xs">{hint}</p>
        ) : null}
      </div>

      {progress ? (
        <div className="space-y-1.5">
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={cn("h-full rounded-full transition-all", ACCENT_BAR[accent])}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {progress.value} of {Number.isFinite(progress.max) ? progress.max : "∞"} active slots used
          </p>
        </div>
      ) : null}

      {href && cta ? (
        <Link
          href={href}
          className="text-primary mt-auto inline-flex w-fit items-center gap-1 text-sm font-medium hover:underline"
        >
          {cta}
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
