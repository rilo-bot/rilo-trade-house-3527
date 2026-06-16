"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * shadcn/ui Calendar — a styled date picker built on react-day-picker (v10).
 * Used standalone or inside the `DateTimePicker` (components/common).
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn(defaults.months, "relative flex flex-col gap-4 sm:flex-row"),
        month: cn(defaults.month, "flex flex-col gap-4"),
        month_caption: cn(
          defaults.month_caption,
          "relative flex h-7 items-center justify-center",
        ),
        caption_label: cn(defaults.caption_label, "text-sm font-medium"),
        nav: cn(
          defaults.nav,
          "absolute inset-x-0 top-0 flex items-center justify-between px-1",
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-60 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-60 hover:opacity-100",
        ),
        month_grid: cn(defaults.month_grid, "w-full border-collapse"),
        weekdays: cn(defaults.weekdays, "flex"),
        weekday: cn(
          defaults.weekday,
          "text-muted-foreground w-8 rounded-md text-[0.8rem] font-normal",
        ),
        week: cn(defaults.week, "mt-2 flex w-full"),
        day: cn(
          defaults.day,
          "relative size-8 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 rounded-md p-0 font-normal aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary aria-selected:hover:text-primary-foreground",
        ),
        today: cn(defaults.today, "[&>button]:bg-accent [&>button]:text-accent-foreground"),
        outside: cn(defaults.outside, "text-muted-foreground opacity-50"),
        disabled: cn(defaults.disabled, "text-muted-foreground opacity-50"),
        hidden: cn(defaults.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...rest }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("size-4", chevronClass)} {...rest} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
