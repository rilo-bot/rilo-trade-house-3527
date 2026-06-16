"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { ListingType } from "@/lib/enums";
import type { Listing } from "@/features/listings/listings.repository";
import { useApi } from "@/hooks/use-api";
import { useFavoritesStore } from "@/stores/favorites-store-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListingCard } from "./listing-card";
import { ListingGridSkeleton } from "./listing-card-skeleton";
import { Reveal } from "@/components/common/reveal";
import { AskAssistantButton } from "@/features/assistant/components/ask-assistant-button";

const ALL = "all";

// Short, seeker-friendly labels for the type filter (the enum labels are longer).
const TYPE_TABS: { value: string; label: string }[] = [
  { value: ALL, label: "All" },
  { value: ListingType.Sale, label: "Buy" },
  { value: ListingType.Rent, label: "Rent" },
  { value: ListingType.Pg, label: "Flatmates" },
];

type SortKey = "recent" | "price_asc" | "price_desc";

/**
 * Wishlist results. Fetches the signed-in user's saved listings from
 * `GET /api/favorites/listings` (visible network call) with skeletons while
 * loading, then renders the cards behind a type filter + sort. Un-saved items
 * (heart toggled off) clear on the next load.
 */
export function WishlistGrid() {
  const { data, loading, error } = useApi<{ listings: Listing[] }>(
    "/api/favorites/listings",
  );

  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [sort, setSort] = useState<SortKey>("recent");

  // This page IS the full wishlist, so seed every id and set the exact count
  // into the shared favorites store (keeps the navbar badge accurate).
  const seedFavorites = useFavoritesStore((s) => s.seed);
  useEffect(() => {
    if (!data) return;
    const ids = data.listings.map((l) => l.id);
    seedFavorites(ids, ids.length);
  }, [data, seedFavorites]);

  const saved = useMemo(() => data?.listings ?? [], [data]);

  // Counts per type for the filter chips (only chips with results are shown).
  const counts = useMemo(() => {
    const c: Record<string, number> = { [ALL]: saved.length };
    for (const l of saved) c[l.listingType] = (c[l.listingType] ?? 0) + 1;
    return c;
  }, [saved]);

  const visible = useMemo(() => {
    const list =
      typeFilter === ALL
        ? saved
        : saved.filter((l) => l.listingType === typeFilter);
    if (sort === "price_asc")
      return [...list].sort((a, b) => a.price.amount - b.price.amount);
    if (sort === "price_desc")
      return [...list].sort((a, b) => b.price.amount - a.price.amount);
    return list; // "recent" — keep API order (newest-saved first)
  }, [saved, typeFilter, sort]);

  if (loading) {
    return (
      <>
        <p className="text-muted-foreground mb-6 text-sm">
          Loading your saved homes…
        </p>
        <ListingGridSkeleton count={3} />
      </>
    );
  }

  if (error) {
    return (
      <div className="border-destructive/40 text-destructive rounded-2xl border border-dashed p-12 text-center">
        {error}
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="border-border bg-card/50 flex flex-col items-center gap-4 rounded-2xl border border-dashed p-14 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-linear-to-br from-rose-500/15 to-red-600/10">
          <Heart className="size-8 text-rose-500" />
        </div>
        <div>
          <p className="text-lg font-semibold">No saved homes yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Tap the <Heart className="inline size-3.5 -translate-y-px" /> on any
            property to save it here for later.
          </p>
        </div>
        <div className="mt-1 flex flex-col items-center gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/properties">Browse properties</Link>
          </Button>
          <AskAssistantButton
            prompt="Help me find a home to save — ask me what I'm looking for."
            variant="ghost"
            size="lg"
          >
            Ask the assistant
          </AskAssistantButton>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar: type filter chips + sort. */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {TYPE_TABS.filter(
            (t) => t.value === ALL || (counts[t.value] ?? 0) > 0,
          ).map((t) => {
            const active = typeFilter === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTypeFilter(t.value)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    active ? "bg-primary-foreground/20" : "bg-muted-foreground/10"
                  }`}
                >
                  {counts[t.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Sort saved homes">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently saved</SelectItem>
            <SelectItem value="price_asc">Price: low to high</SelectItem>
            <SelectItem value="price_desc">Price: high to low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center">
          <Search className="size-7 opacity-40" />
          <p className="text-sm">No saved homes in this category.</p>
          <Button variant="outline" size="sm" onClick={() => setTypeFilter(ALL)}>
            Show all
          </Button>
        </div>
      ) : (
        <Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </Reveal>
      )}
    </>
  );
}
