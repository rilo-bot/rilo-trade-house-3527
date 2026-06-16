"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Date + time picker (shadcn Calendar + separate Hour / Minute / AM-PM selects)
 * that reads/writes the same "YYYY-MM-DDTHH:mm" string the native datetime-local
 * input used — a drop-in for forms whose Zod schema expects that string.
 *
 * The value is assembled from the picked wall-clock PARTS (not via `new Date`),
 * so it never shifts with the host/browser timezone. For listing times (auctions,
 * open homes) the app treats that wall-clock as NZ time — hence the "NZ" label.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

type Parts = { y: number; mo: number; d: number; h24: number; min: number };

/** Parse "YYYY-MM-DDTHH:mm" into parts (no Date, so timezone-stable). */
function parseValue(value: string): Parts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3], h24: +m[4], min: +m[5] };
}

function buildValue(p: Parts): string {
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h24)}:${pad(p.min)}`;
}

/** 24h → 12h hour (1–12). */
function to12(h24: number): number {
  return ((h24 + 11) % 12) + 1;
}
/** 12h hour + meridiem → 24h. */
function to24(h12: number, meridiem: "AM" | "PM"): number {
  if (meridiem === "PM") return h12 === 12 ? 12 : h12 + 12;
  return h12 === 12 ? 0 : h12;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59

export interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  /** Disable specific days in the calendar (e.g. past dates). */
  disabled?: React.ComponentProps<typeof Calendar>["disabled"];
}

export function DateTimePicker({
  value,
  onChange,
  id,
  placeholder = "Pick date & time",
  className,
  "aria-invalid": ariaInvalid,
  disabled,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = parseValue(value);
  const has = parsed !== null;
  const h24 = parsed?.h24 ?? 12;
  const min = parsed?.min ?? 0;
  const h12 = to12(h24);
  const meridiem: "AM" | "PM" = h24 < 12 ? "AM" : "PM";
  const selectedDate = parsed
    ? new Date(parsed.y, parsed.mo - 1, parsed.d)
    : undefined;

  // Merge a partial change into the current parts (defaulting an unset
  // date/time to today, 12:00) and emit the assembled string.
  const update = (next: Partial<Parts>) => {
    const now = new Date();
    const base: Parts = parsed ?? {
      y: now.getFullYear(),
      mo: now.getMonth() + 1,
      d: now.getDate(),
      h24: 12,
      min: 0,
    };
    onChange(buildValue({ ...base, ...next }));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          aria-invalid={ariaInvalid}
          className={cn(
            "w-full justify-start text-left font-normal",
            !has && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          {has
            ? format(
                new Date(parsed.y, parsed.mo - 1, parsed.d, parsed.h24, parsed.min),
                "d MMM yyyy, h:mm a",
              )
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(sel) =>
            sel &&
            update({
              y: sel.getFullYear(),
              mo: sel.getMonth() + 1,
              d: sel.getDate(),
            })
          }
          disabled={disabled}
          autoFocus
        />
        <div className="border-t p-3">
          <Label className="text-muted-foreground text-xs">Time (NZ)</Label>
          <div className="mt-1.5 flex items-center gap-1.5">
            {/* Hour */}
            <Select
              value={has ? String(h12) : undefined}
              onValueChange={(v) => update({ h24: to24(Number(v), meridiem) })}
            >
              <SelectTrigger
                id={id ? `${id}-hour` : undefined}
                className="w-[68px]"
                aria-label="Hour"
              >
                <SelectValue placeholder="Hr" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            {/* Minute */}
            <Select
              value={has ? pad(min) : undefined}
              onValueChange={(v) => update({ min: Number(v) })}
            >
              <SelectTrigger
                id={id ? `${id}-minute` : undefined}
                className="w-[72px]"
                aria-label="Minute"
              >
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {MINUTES.map((m) => (
                  <SelectItem key={m} value={pad(m)}>
                    {pad(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* AM / PM */}
            <Select
              value={has ? meridiem : undefined}
              onValueChange={(v) => update({ h24: to24(h12, v as "AM" | "PM") })}
            >
              <SelectTrigger
                id={id ? `${id}-meridiem` : undefined}
                className="w-[74px]"
                aria-label="AM or PM"
              >
                <SelectValue placeholder="AM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="PM">PM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
