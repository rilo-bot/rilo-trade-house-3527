import type { ReactNode } from "react";
import { Reveal } from "@/components/common/reveal";
import { cn } from "@/lib/utils";

/**
 * Elevated page header used across interior pages (browse, dashboard, etc.) to
 * carry the landing page's premium language: a serif display title on a subtle
 * tinted band, with an optional eyebrow, subtitle, and right-aligned actions.
 * Server Component — the motion comes from the <Reveal> wrapper.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  /** Optional right-aligned content (buttons, links). */
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-accent border-border border-b", className)}>
      <div className="mx-auto w-full max-w-page px-4 py-10 sm:py-14">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              {eyebrow ? (
                <span className="text-primary text-sm font-semibold tracking-wide uppercase">
                  {eyebrow}
                </span>
              ) : null}
              <h1 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-muted-foreground max-w-2xl text-pretty">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
