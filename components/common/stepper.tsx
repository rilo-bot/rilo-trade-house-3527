import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Presentational horizontal stepper — numbered circles joined by connectors,
 * with a label under each. Reusable across any multi-step flow.
 *
 *   <Stepper steps={["Setup", "Details", "Review"]} current={1} />
 *
 * `current` is the active step index (0-based). Steps before it render as
 * completed (filled + check), the current as active (filled), the rest muted.
 */
export function Stepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex w-full items-start", className)}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === steps.length - 1;
        return (
          <li
            key={label}
            className={cn("flex items-start", !isLast && "flex-1")}
          >
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "relative flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  (done || active) &&
                    "border-primary bg-primary text-primary-foreground",
                  !done && !active && "border-border bg-background text-muted-foreground",
                )}
              >
                {active && (
                  <>
                    {/* Subtle steady halo. */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -inset-0.5 rounded-full ring-2 ring-primary/25"
                    />
                    {/* Small radiating ring — stays tight (no big expansion). */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -inset-0.5 rounded-full ring-2 ring-primary/30 motion-safe:animate-ping animation-duration-[1.8s]"
                    />
                  </>
                )}
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "max-w-20 text-center text-xs leading-tight",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hidden sm:block",
                )}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <span
                className={cn(
                  "mt-4 h-0.5 flex-1 rounded transition-colors",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
