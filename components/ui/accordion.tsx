"use client";

import * as React from "react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn(className)} {...props} />;
}

function AccordionTrigger({
  className,
  children,
  icon,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  /** Replaces the default chevron indicator (e.g. a rotating "+"). */
  icon?: React.ReactNode;
}) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group/trigger flex flex-1 cursor-pointer items-center justify-between gap-4 text-left font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
        {...props}
      >
        {children}
        {icon ?? (
          <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
        )}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn("pt-0 pb-5", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
