"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark, Loader2, MessageSquare, Search, Trash2, X } from "lucide-react";
import { ListingStatus, ListingType } from "@/lib/enums";
import type { Listing } from "@/features/listings/listings.repository";
import {
  LISTING_TYPE_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
  formatSalePrice,
} from "@/features/listings/listing-labels";
import { PostPropertyButton } from "@/features/listings/components/post-property-button";
import { EditListingButton } from "@/features/listings/components/edit-listing-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { imageSrc } from "@/lib/utils";

const PAGE_SIZE = 10;
const ALL = "all"; // Radix Select can't use an empty value — sentinel for "no filter".

// Statuses an owner actually manages by.
const STATUS_FILTERS = [
  ListingStatus.Active,
  ListingStatus.Draft,
  ListingStatus.RentedSold,
] as const;

type ApiData = {
  listings: Listing[];
  leadCounts: Record<string, number>;
  saveCounts: Record<string, number>;
  total: number;
  page: number;
  totalPages: number;
};

/**
 * Owner's listing manager — search (API-backed, debounced), filter by
 * status/type, infinite scroll, plus view/edit/delete. Seeded with the
 * server-rendered first page, then fetches `/api/listings?scope=mine` on the
 * client so it always reflects fresh data.
 */
export function MyListings({
  initial,
  initialTotal,
  initialTotalPages,
  leadCounts = {},
  saveCounts = {},
}: {
  initial: Listing[];
  initialTotal: number;
  initialTotalPages: number;
  leadCounts?: Record<string, number>;
  saveCounts?: Record<string, number>;
}) {
  const router = useRouter();

  const [listings, setListings] = useState(initial);
  const [counts, setCounts] = useState(leadCounts);
  const [saves, setSaves] = useState(saveCounts);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [listingType, setListingType] = useState<string>(ALL);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // The listing pending delete confirmation (drives the confirm dialog).
  const [confirmTarget, setConfirmTarget] = useState<Listing | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  // Bumped to force a reload (e.g. after a listing is created elsewhere).
  const [reloadKey, setReloadKey] = useState(0);

  const hasFilters = q.trim() !== "" || status !== ALL || listingType !== ALL;

  const buildQuery = useCallback(
    (targetPage: number) => {
      const p = new URLSearchParams({
        scope: "mine",
        page: String(targetPage),
        limit: String(PAGE_SIZE),
      });
      if (q.trim()) p.set("q", q.trim());
      if (status !== ALL) p.set("status", status);
      if (listingType !== ALL) p.set("listingType", listingType);
      return p.toString();
    },
    [q, status, listingType],
  );

  // First page — refetched (debounced) whenever the search/filters change, on
  // mount, and on a `listings:changed` event. Replaces the current list.
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/listings?${buildQuery(1)}`);
        const json = await res.json();
        if (active && !json.error && json.data) {
          const data = json.data as ApiData;
          setListings(data.listings);
          setCounts(data.leadCounts ?? {});
          setSaves(data.saveCounts ?? {});
          setTotal(data.total);
          setPage(data.page);
          setTotalPages(data.totalPages);
        }
      } catch {
        // Keep the current data on failure.
      } finally {
        if (active) setLoading(false);
      }
    }, 300); // debounce typing

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [buildQuery, reloadKey]);

  // Refetch when a listing is created/edited elsewhere (wizard dispatches this).
  useEffect(() => {
    const onChanged = () => setReloadKey((k) => k + 1);
    window.addEventListener("listings:changed", onChanged);
    return () => window.removeEventListener("listings:changed", onChanged);
  }, []);

  // Append the next page (infinite scroll). A ref guards against the observer
  // firing many times before `loadingMore` state updates (which would spawn
  // dozens of concurrent identical requests).
  const fetchingRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || loading || page >= totalPages) return;
    fetchingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/listings?${buildQuery(page + 1)}`);
      const json = await res.json();
      if (!json.error && json.data) {
        const data = json.data as ApiData;
        // De-dupe by id so a re-fetch can never insert a listing twice.
        setListings((cur) => {
          const seen = new Set(cur.map((l) => l.id));
          return [...cur, ...data.listings.filter((l) => !seen.has(l.id))];
        });
        setCounts((cur) => ({ ...cur, ...data.leadCounts }));
        setSaves((cur) => ({ ...cur, ...data.saveCounts }));
        setPage(data.page);
        setTotalPages(data.totalPages);
      }
    } catch {
      // Ignore — the sentinel can retry on the next scroll.
    } finally {
      fetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [buildQuery, loading, page, totalPages]);

  // Auto-load the next page when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = page < totalPages;
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

  // Deletes the listing currently held in `confirmTarget` (set by the trash
  // button, confirmed via the dialog). Keeps the dialog open with an error if
  // the request fails rather than silently dropping it.
  const confirmDelete = async () => {
    if (!confirmTarget) return;
    const id = confirmTarget.id;
    setDeletingId(id);
    setDeleteError(false);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setListings((cur) => cur.filter((l) => l.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setConfirmTarget(null);
      router.refresh();
    } catch {
      setDeleteError(true);
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setQ("");
    setStatus(ALL);
    setListingType(ALL);
  };

  return (
    <div className="space-y-4">
      {/* Search + filters toolbar. */}
      <div className="border-border bg-card shadow-soft flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your properties by title…"
            className="pl-9"
            aria-label="Search your properties"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={listingType} onValueChange={setListingType}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All types</SelectItem>
            {Object.values(ListingType).map((t) => (
              <SelectItem key={t} value={t}>
                {LISTING_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Result line. */}
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" /> Searching…
          </>
        ) : (
          <>
            {total} {total === 1 ? "property" : "properties"}
            {hasFilters && " match your filters"}
          </>
        )}
      </p>

      {/* Empty states. */}
      {!loading && listings.length === 0 ? (
        hasFilters ? (
          <div className="border-border rounded-xl border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              No properties match your search or filters.
            </p>
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-border rounded-xl border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              You haven&apos;t posted any properties yet.
            </p>
            <div className="mt-4 flex justify-center">
              <PostPropertyButton>Post your first property</PostPropertyButton>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <div
              key={l.id}
              className="border-border bg-card shadow-soft flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4"
            >
              {/* Image + info — share a row on every screen size. */}
              <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                <div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
                  {l.media?.images?.[0] ? (
                    <Image
                      src={imageSrc(l.media.images[0])}
                      alt={l.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-[10px]">
                      No photo
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[l.status]}`}
                    >
                      {STATUS_LABELS[l.status]}
                    </span>
                    {counts[l.id] > 0 && (
                      <Link
                        href="/dashboard/leads"
                        className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
                      >
                        <MessageSquare className="size-3" /> {counts[l.id]} leads
                      </Link>
                    )}
                    {saves[l.id] > 0 && (
                      <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                        <Bookmark className="size-3" /> {saves[l.id]} saved
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 line-clamp-1 font-medium">{l.title}</h3>
                  <p className="text-muted-foreground line-clamp-1 text-sm">
                    {formatSalePrice(l.price)} · {l.location.locality},{" "}
                    {l.location.city}
                  </p>
                </div>
              </div>

              {/* Actions — drop to their own row (with a divider) on mobile. */}
              <div className="border-border flex shrink-0 items-center justify-end gap-1 border-t pt-2 sm:gap-2 sm:border-t-0 sm:pt-0">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/properties/${l.id}`}>View</Link>
                </Button>
                <EditListingButton listing={l} />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setDeleteError(false);
                    setConfirmTarget(l);
                  }}
                  disabled={deletingId === l.id}
                  aria-label="Delete listing"
                >
                  {deletingId === l.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="text-destructive size-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}

          {/* Infinite-scroll sentinel — observed to auto-load the next page. */}
          {hasMore && (
            <div
              ref={sentinelRef}
              className="flex h-10 items-center justify-center"
            >
              {loadingMore && (
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation — replaces a native window.confirm(). */}
      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          // Don't let an outside-click/Escape dismiss mid-delete.
          if (!open && deletingId === null) {
            setConfirmTarget(null);
            setDeleteError(false);
          }
        }}
      >
        <DialogContent className="max-w-md" showClose={deletingId === null}>
          <DialogHeader>
            <DialogTitle>Delete this listing?</DialogTitle>
            <DialogDescription>
              {confirmTarget
                ? `“${confirmTarget.title}” will be permanently removed. This can't be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p className="text-destructive px-5 pt-4 text-sm" role="alert">
              Couldn&apos;t delete that listing. Please try again.
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deletingId !== null}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingId !== null}
            >
              {deletingId !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="size-4" /> Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
