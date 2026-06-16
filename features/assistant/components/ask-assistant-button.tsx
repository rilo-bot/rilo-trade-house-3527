"use client";

import type { ComponentProps, ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistant } from "@/stores/assistant-store-provider";
import type { AssistantContext } from "@/stores/assistant-store";

type ButtonProps = ComponentProps<typeof Button>;

type AskAssistantButtonProps = {
  /** Auto-send this question when clicked. */
  prompt?: string;
  /** Or drop this text into the composer for the user to edit + send. */
  prefill?: string;
  /** Page/listing context to attach (what "this" refers to). */
  context?: AssistantContext;
  children: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  /** Show the leading sparkle (default true). */
  showIcon?: boolean;
};

/**
 * The one-liner for putting an AI helper anywhere: a button that opens the
 * site-wide assistant and (optionally) asks a question or prefills the composer,
 * carrying along the context of what the user is looking at. With neither
 * `prompt` nor `prefill` it just opens the panel.
 */
export function AskAssistantButton({
  prompt,
  prefill,
  context,
  children,
  variant = "outline",
  size = "sm",
  className,
  showIcon = true,
}: AskAssistantButtonProps) {
  const { ask, prefill: prefillComposer, openAssistant } = useAssistant();

  function onClick() {
    if (prompt) ask(prompt, context);
    else if (prefill) prefillComposer(prefill, context);
    else openAssistant();
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
    >
      {showIcon && <Sparkles className="size-4" />}
      {children}
    </Button>
  );
}
