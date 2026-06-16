"use client";

import { useCallback, useState } from "react";

/**
 * Copies text to the clipboard and exposes a transient `copied` flag (handy
 * for "Copied!" feedback). The flag resets after `resetDelay` ms.
 *
 *   const { copied, copy } = useCopyToClipboard();
 *   <button onClick={() => copy(value)}>{copied ? "Copied!" : "Copy"}</button>
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelay);
        return true;
      } catch {
        setCopied(false);
        return false;
      }
    },
    [resetDelay],
  );

  return { copied, copy };
}
