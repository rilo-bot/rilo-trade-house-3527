"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import type { Listing, SearchResult } from "@/features/listings/listings.repository";
import {
  ListingsSearchStoreProvider,
  useListingsSearchStore,
} from "@/features/listings/listings-search-store-provider";
import { useFavoritesStore } from "@/stores/favorites-store-provider";
import { SaveSearchButton } from "@/features/saved-searches/components/save-search-button";
import { AskAssistantButton } from "@/features/assistant/components/ask-assistant-button";
import { PropertyFilters, type FilterValues } from "./property-filters";
import { ListingCard } from "./listing-card";
import { ListingGridSkeleton } from "./listing-card-skeleton";

/** Page size — load this many first, then more as the user scrolls. */
const PAGE_SIZE = 10;

type SearchJson = {
  data: SearchResult | null;
  error: { message?: string } | null;
} | null;

/**
 * Client-side property browser. Data flows in ONE direction:
 *
 *   GET /api/listings  →  listings-search store  →  UI
 *
 * The first page (and every new search) is a real, visible network call written
 * into the store; the view reads from it. Subsequent pages are appended via
 * infinite scroll (an IntersectionObserver sentinel at the bottom of the grid).
 */
export function PropertiesBrowser(props: {
  initialFilters: FilterValues;
  /** Query string (without `?`) used for the very first fetch. */
  initialQuery: string;
}) {
  return (
    <ListingsSearchStoreProvider>
      <PropertiesBrowserInner {...props} />
    </ListingsSearchStoreProvider>
  );
}

function PropertiesBrowserInner({
  initialFilters,
  initialQuery,
}: {
  initialFilters: FilterValues;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const start = useListingsSearchStore((s) => s.start);
  const setResult = useListingsSearchStore((s) => s.setResult);
  const setError = useListingsSearchStore((s) => s.setError);
  const seedFavorites = useFavoritesStore((s) => s.seed);

  // Fetch the FIRST page whenever the search query changes, and push the result
  // (or error) into the store. A new search resets the infinite-scroll list.
  useEffect(() => {
    let cancelled = false;
    start();
    (async () => {
      try {
        const res = await fetch(
          `/api/listings?${query}&page=1&limit=${PAGE_SIZE}`,
          { cache: "no-store" },
        );
        const json: SearchJson = await res.json().catch(() => null);
        if (!res.ok || json?.error || !json?.data) {
          throw new Error(
            json?.error?.message || `Request failed (${res.status})`,
          );
        }
        if (!cancelled) {
          setResult(json.data);
          // Seed the favorites store from this response (per-item `isFavorite`
          // + the user's total `favoritesCount`) — no separate favorites call.
          const favoritedIds = json.data.items
            .filter((i) => i.isFavorite)
            .map((i) => i.id);
          seedFavorites(favoritedIds, json.data.favoritesCount);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, start, setResult, setError, seedFavorites]);

  const runSearch = (params: URLSearchParams) => {
    // Search entirely in place: just drive the store fetch via `query`. The URL
    // is intentionally NOT updated — results live in the store and persist as
    // long as the page isn't reloaded. (Inbound deep links still work because
    // page.tsx reads the URL to seed the first fetch.)
    setQuery(params.toString());
  };

  return (
    <>
      <PropertyFilters initial={initialFilters} onApply={runSearch} />
      <div className="mt-4 flex justify-end">
        {/* key={query} resets the button's "saved" state on each new search. */}
        <SaveSearchButton key={query} query={query} />
      </div>
      <PropertiesResults query={query} />
    </>
  );
}

/** Reads the result set from the store, renders it, and loads more on scroll. */
function PropertiesResults({ query }: { query: string }) {
  const result = useListingsSearchStore((s) => s.result);
  const loading = useListingsSearchStore((s) => s.loading);
  const loadingMore = useListingsSearchStore((s) => s.loadingMore);
  const error = useListingsSearchStore((s) => s.error);
  const startMore = useListingsSearchStore((s) => s.startMore);
  const appendResult = useListingsSearchStore((s) => s.appendResult);
  const setError = useListingsSearchStore((s) => s.setError);
  const seedFavorites = useFavoritesStore((s) => s.seed);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserName = session?.user?.name ?? undefined;
  const currentUserEmail = session?.user?.email ?? undefined;

  const total = result?.total ?? 0;
  const items = result?.items ?? [];
  const hasMore = !!result && result.page < result.totalPages;

  // Distinguish "no results because of refinement filters" (suggest widening)
  // from "nothing listed here yet" (a neutral message). The `listingType` from
  // the Buy/Rent/Flatmates tab is the base category, NOT a refinement.
  const params = new URLSearchParams(query);
  const REFINEMENT_KEYS = [
    "q",
    "region",
    "district",
    "city",
    "cities",
    "minPrice",
    "maxPrice",
    "bedrooms",
    "bathrooms",
    "propertyType",
    "furnishing",
    "pgGender",
    "category",
  ];
  const hasFilters =
    REFINEMENT_KEYS.some((k) => (params.get(k) ?? "").trim() !== "") ||
    ["true", "1"].includes(params.get("openHomes") ?? "");
  const listingType = params.get("listingType");
  const typeNoun =
    listingType === "rent"
      ? "rentals"
      : listingType === "pg"
        ? "flatmate listings"
        : listingType === "sale"
          ? "properties for sale"
          : "properties";

  // Fetch and append the next page. A ref guards against the observer firing
  // many times before `loadingMore` state updates (which would otherwise spawn
  // dozens of concurrent identical requests).
  const fetchingRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (!result || fetchingRef.current || result.page >= result.totalPages) {
      return;
    }
    const nextPage = result.page + 1;
    fetchingRef.current = true;
    startMore();
    try {
      const res = await fetch(
        `/api/listings?${query}&page=${nextPage}&limit=${PAGE_SIZE}`,
        { cache: "no-store" },
      );
      const json: SearchJson = await res.json().catch(() => null);
      if (!res.ok || json?.error || !json?.data) {
        throw new Error(
          json?.error?.message || `Request failed (${res.status})`,
        );
      }
      appendResult(json.data);
      const favoritedIds = json.data.items
        .filter((i) => i.isFavorite)
        .map((i) => i.id);
      seedFavorites(favoritedIds, json.data.favoritesCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      fetchingRef.current = false;
    }
  }, [result, query, startMore, appendResult, seedFavorites, setError]);

  // Auto-load the next page when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <p className="text-muted-foreground mt-6 flex items-center gap-1.5 text-sm">
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" /> Searching…
          </>
        ) : (
          <>
            {total} {total === 1 ? "property" : "properties"} found
          </>
        )}
      </p>

      {loading ? (
        <div className="mt-4">
          <ListingGridSkeleton count={6} />
        </div>
      ) : error ? (
        <div className="border-destructive/40 text-destructive mt-8 rounded-2xl border border-dashed p-12 text-center">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="border-border mt-8 flex flex-col items-center gap-1 rounded-2xl border border-dashed p-12 text-center">
          {hasFilters ? (
            <>
              <p className="text-foreground font-medium">
                No {typeNoun} match your filters
              </p>
              <p className="text-muted-foreground text-sm">
                Try widening or clearing your filters.
              </p>
            </>
          ) : (
            <>
              <p className="text-foreground font-medium">
                No {typeNoun} yet
              </p>
              <p className="text-muted-foreground text-sm">
                There&apos;s nothing listed here right now — check back soon.
              </p>
            </>
          )}
          <AskAssistantButton
            prompt="Help me find the right property — ask me what I'm looking for and suggest some options."
            variant="outline"
            size="sm"
            className="mt-3"
          >
            Ask the assistant to help
          </AskAssistantButton>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((listing: Listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserEmail={currentUserEmail}
              />
            ))}
          </div>

          {/* Infinite-scroll sentinel — observed to auto-load the next page. */}
          {hasMore && (
            <div
              ref={sentinelRef}
              className="mt-8 flex h-10 items-center justify-center"
            >
              {loadingMore && (
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              )}
            </div>
          )}

          {!hasMore && items.length > 0 && (
            <p className="text-muted-foreground mt-8 text-center text-sm">
              You&apos;ve reached the end · {total}{" "}
              {total === 1 ? "property" : "properties"}
            </p>
          )}
        </>
      )}
    </>
  );
}
