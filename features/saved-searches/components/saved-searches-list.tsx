"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, Compass, Search, Trash2 } from "lucide-react";
import type { SavedSearch } from "@/features/saved-searches/saved-searches.repository";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { describeQuery, queryToParams } from "../saved-search-labels";

type ListJson = {
  data: { savedSearches: SavedSearch[] } | null;
  error: { message?: string } | null;
} | null;

/**
 * Client manager for the seeker's saved searches: lists them, runs one (links
 * to /properties with the stored filters), toggles new-match alerts, and
 * deletes. Mirrors the WishlistGrid fetch pattern (visible GET on mount).
 */
export function SavedSearchesList() {
  const [items, setItems] = useState<SavedSearch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/saved-searches", { cache: "no-store" });
        const json: ListJson = await res.json().catch(() => null);
        if (!res.ok || json?.error || !json?.data) {
          throw new Error(json?.error?.message || `Request failed (${res.status})`);
        }
        if (!cancelled) setItems(json.data.savedSearches);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleAlerts(s: SavedSearch) {
    setBusy(s.id);
    try {
      const res = await fetch(`/api/saved-searches/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertsEnabled: !s.alertsEnabled }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev?.map((x) =>
          x.id === s.id ? { ...x, alertsEnabled: !s.alertsEnabled } : x,
        ) ?? prev,
      );
    } finally {
      setBusy(null);
    }
  }

  async function remove(s: SavedSearch) {
    setBusy(s.id);
    try {
      const res = await fetch(`/api/saved-searches/${s.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error();
      setItems((prev) => prev?.filter((x) => x.id !== s.id) ?? prev);
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="border-destructive/40 text-destructive rounded-2xl border border-dashed p-12 text-center">
        {error}
      </div>
    );
  }

  if (items === null) {
    return (
      <div
        className="space-y-3"
        role="status"
        aria-label="Loading saved searches"
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-card shadow-soft rounded-2xl border p-4"
          >
            <div className="bg-muted h-5 w-1/3 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-4 w-2/3 animate-pulse rounded" />
            <div className="mt-3 flex gap-2">
              <div className="bg-muted h-8 w-24 animate-pulse rounded-lg" />
              <div className="bg-muted h-8 w-20 animate-pulse rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
        <Search className="text-muted-foreground size-8 opacity-40" />
        <div>
          <p className="text-foreground font-medium">No saved searches yet</p>
          <p className="text-muted-foreground text-sm">
            Save a search to get emailed when new matching homes are listed.
          </p>
        </div>
        <Button asChild variant="outline" className="mt-1">
          <Link href="/properties">
            <Compass className="size-4" /> Browse properties
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((s) => {
        const href = `/properties?${queryToParams(s.query).toString()}`;
        return (
          <li
            key={s.id}
            className="border-border bg-card shadow-soft flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-muted-foreground mt-0.5 truncate text-sm">
                {describeQuery(queryToParams(s.query))}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild size="sm">
                <Link href={href}>
                  <Search className="size-4" /> Run
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={busy === s.id}
                onClick={() => toggleAlerts(s)}
                title={s.alertsEnabled ? "Alerts on" : "Alerts off"}
                className={cn(
                  s.alertsEnabled && "text-primary border-primary/40",
                )}
              >
                {s.alertsEnabled ? (
                  <Bell className="size-4" />
                ) : (
                  <BellOff className="size-4" />
                )}
                <span className="hidden sm:inline">
                  {s.alertsEnabled ? "Alerts on" : "Alerts off"}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy === s.id}
                onClick={() => remove(s)}
                title="Delete saved search"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
