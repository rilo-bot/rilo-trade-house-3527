"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DescribeFields } from "@/features/assistant/describe.schema";

type DescribeJson = {
  data: { description?: string } | null;
  error: { message?: string } | null;
} | null;

/**
 * "Write with AI" / "Improve with AI" control for the listing wizard's
 * description field. Collects the structured facts the owner already entered
 * (via `getFields`), asks POST /api/assistant/describe to draft prose, and hands
 * the result back through `onResult` for the owner to review and edit. The
 * generated text is a suggestion — never submitted automatically.
 */
export function DescriptionAssist({
  getFields,
  hasDraft,
  onResult,
}: {
  getFields: () => DescribeFields;
  hasDraft: boolean;
  onResult: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...getFields(),
          mode: hasDraft ? "improve" : "generate",
        }),
      });
      const json = (await res.json().catch(() => null)) as DescribeJson;
      const text = json?.data?.description?.trim();
      if (!res.ok || json?.error || !text) {
        throw new Error(
          json?.error?.message || `Request failed (${res.status})`,
        );
      }
      onResult(text);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't generate a description. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={run}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : hasDraft ? (
          <RefreshCw className="size-4" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {loading ? "Writing…" : hasDraft ? "Improve with AI" : "Write with AI"}
      </Button>
      {error ? (
        <span className="text-destructive text-xs">{error}</span>
      ) : (
        <span className="text-muted-foreground text-xs">
          Drafts from your details — review before saving.
        </span>
      )}
    </div>
  );
}
