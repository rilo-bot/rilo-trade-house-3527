"use client";

import * as React from "react";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

/**
 * Collapsible content with a smooth height animation. Radix measures the natural
 * content height into `--radix-collapsible-content-height`; the
 * `collapsible-down`/`collapsible-up` keyframes (from tw-animate-css) animate to
 * it, so the panel expands/collapses to its real height — no JS height math.
 */
function CollapsibleContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
      {...props}
    >
      <div className={cn(className)}>{children}</div>
    </CollapsiblePrimitive.Content>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
