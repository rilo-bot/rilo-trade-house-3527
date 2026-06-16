"use client";

import { useEffect } from "react";
import { useAssistant } from "@/stores/assistant-store-provider";
import type { AssistantContext } from "@/stores/assistant-store";

/**
 * Registers ambient page context with the assistant store while mounted, and
 * clears it on unmount. Drop it into any page (server or client) that has a
 * listing/suburb in focus so the assistant knows what "this" means — e.g.
 * `<AssistantContextSetter listingId={id} listingTitle={title} suburb={s} />`.
 *
 * Renders nothing.
 */
export function AssistantContextSetter(context: AssistantContext) {
  const { setContext } = useAssistant();
  // Re-run when any field actually changes (object identity would churn).
  const key = JSON.stringify(context);

  useEffect(() => {
    setContext(context);
    return () => setContext(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setContext]);

  return null;
}
