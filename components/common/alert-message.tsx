import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success" | "info";

const VARIANTS: Record<
  AlertVariant,
  { className: string; Icon: typeof Info }
> = {
  error: {
    className: "border-destructive/20 bg-destructive/8 text-destructive",
    Icon: CircleAlert,
  },
  success: {
    className:
      "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Icon: CircleCheck,
  },
  info: {
    className: "border-primary/20 bg-primary/8 text-primary",
    Icon: Info,
  },
};

/**
 * Inline form/page alert: an icon plus a message in a soft tinted box. Used for
 * validation errors, success notices, and hints across auth and forms.
 */
export function AlertMessage({
  variant = "error",
  children,
  className,
}: {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}) {
  const { className: variantClass, Icon } = VARIANTS[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        variantClass,
        className,
      )}
    >
      <Icon className="mt-px size-4 shrink-0" />
      <div className="min-w-0 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  );
}
