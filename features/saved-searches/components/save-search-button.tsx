"use client";

import { useState } from "react";
import Link from "next/link";
import { BellPlus, Check, Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { describeQuery } from "../saved-search-labels";

/**
 * "Save this search" — captures the current filters and POSTs them to
 * /api/saved-searches with alerts on. Only shown to signed-in users (saved
 * searches are per-account). Auto-names the search from its filters; the user
 * can rename it on the Saved searches page. Re-mount via `key={query}` resets
 * the saved state when the search changes.
 */
export function SaveSearchButton({ query }: { query: string }) {
  const { data: session } = useSession();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  if (!session?.user) return null;

  const params = new URLSearchParams(query);
  ["page", "limit", "sort"].forEach((k) => params.delete(k));

  async function save() {
    setState("saving");
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: describeQuery(params) || "My search",
          query: Object.fromEntries(params.entries()),
        }),
      });
      if (!res.ok) throw new Error();
      setState("saved");
    } catch {
      setState("error");
    }
  }

  if (state === "saved") {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Check className="size-4 text-emerald-600" /> Search saved ·{" "}
        <Link href="/saved-searches" className="text-primary hover:underline">
          Manage
        </Link>
      </p>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={save}
      disabled={state === "saving"}
    >
      {state === "saving" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <BellPlus className="size-4" />
      )}
      {state === "error" ? "Try again" : "Save this search"}
    </Button>
  );
}
