"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight multi-select dropdown (button + checkbox panel). Reusable for any
 * "pick several from a list" filter. Controlled via `value`/`onChange`.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  className,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (opt: string) =>
    onChange(
      value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt],
    );

  const label =
    value.length === 0
      ? placeholder
      : value.length <= 2
        ? value.join(", ")
        : `${value.length} selected`;

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
          {label}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-60" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 max-h-64 w-full min-w-44 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
            {options.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                No options
              </p>
            ) : (
              options.map((opt) => {
                const selected = value.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {selected && <Check className="size-3" />}
                    </span>
                    <span className="truncate">{opt}</span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
