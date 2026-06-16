"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchResult } from "@/features/listings/listings.repository";
import { browseHref } from "@/lib/utils";
import { useApi } from "@/hooks/use-api";
import { useHomeSearchStore } from "@/stores/home-search-store-provider";
import { useFavoritesStore } from "@/stores/favorites-store-provider";
import { Reveal } from "@/components/common/reveal";
import { FeaturedListingCard } from "./featured-listing-card";
import { ListingGridSkeleton } from "./listing-card-skeleton";

/**
 * Featured properties grid. Fetches active listings from the public JSON API
 * (`GET /api/listings?…&limit=6`) on the client — so it shows as a real network
 * call — with skeleton placeholders while loading.
 *
 * It doubles as the home page's live search results: when the hero search bar
 * sets a query (see hero-search.tsx + the home-search store), this grid re-runs
 * the API call with those filters and renders the matches IN PLACE — no
 * navigation. Only real listings are shown — when there are none, it renders an
 * empty state rather than placeholder/demo data.
 */
export function FeaturedListings() {
  const query = useHomeSearchStore((s) => s.query);
  const active = useHomeSearchStore((s) => s.active);
  const reset = useHomeSearchStore((s) => s.reset);

  const { data, loading } = useApi<SearchResult>(
    `/api/listings?${query ? `${query}&` : ""}limit=8`,
  );

  // Seed the favorites store from this response (per-item `isFavorite` + the
  // user's total `favoritesCount`) — no separate favorites call needed.
  const seedFavorites = useFavoritesStore((s) => s.seed);
  useEffect(() => {
    if (!data) return;
    const favoritedIds = data.items.filter((i) => i.isFavorite).map((i) => i.id);
    seedFavorites(favoritedIds, data.favoritesCount);
  }, [data, seedFavorites]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasReal = items.length > 0;

  return (
    <section className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {active ? "Search results" : "Featured properties"}
          </h2>
          <p className="text-muted-foreground">
            {loading
              ? "Loading the latest homes…"
              : active
                ? `${total} ${total === 1 ? "property" : "properties"} match your search.`
                : hasReal
                  ? "Fresh listings from across the platform."
                  : "No properties listed yet — check back soon."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {active && (
            <Button
              variant="ghost"
              className="text-muted-foreground rounded-full"
              onClick={reset}
            >
              <X className="size-4" /> Clear
            </Button>
          )}
          <Link
            href={active && query ? browseHref(query) : "/properties"}
            className="text-foreground hover:text-primary text-sm font-medium underline decoration-1 underline-offset-4 transition-colors"
          >
            Explore all listings
          </Link>
        </div>
      </div>

      {loading ? (
        <ListingGridSkeleton count={8} className="xl:grid-cols-4" />
      ) : active && !hasReal ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-12 text-center">
          No properties match your search.{" "}
          <button
            type="button"
            onClick={reset}
            className="text-primary font-medium hover:underline"
          >
            Clear filters
          </button>{" "}
          to see the latest listings.
        </div>
      ) : !hasReal ? (
        <div className="border-border rounded-xl border border-dashed p-12 text-center">
          <p className="text-foreground font-medium">No properties listed yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            New homes are added all the time — check back soon, or list yours.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild>
              <Link href="/post-property">List your property</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((listing, i) => (
            <Reveal key={listing.id} delay={(i % 4) * 80}>
              <FeaturedListingCard listing={listing} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
