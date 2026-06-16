import { cn } from "@/lib/utils";

/**
 * Loading placeholders for listing grids. Mirrors `ListingCard`'s shape (image
 * + body lines) so the layout doesn't shift when real data swaps in.
 */
export function ListingCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="aspect-[4/3] bg-muted" />
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
        <div className="mt-2 flex gap-3 pt-2">
          <div className="h-3 w-10 rounded bg-muted" />
          <div className="h-3 w-10 rounded bg-muted" />
          <div className="h-3 w-12 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

/**
 * A responsive grid of `ListingCardSkeleton`s (defaults to 6, 3-up on desktop).
 * Pass `className` to override the column count for a specific grid (e.g.
 * `xl:grid-cols-4` so the loading state matches a 4-up layout).
 */
export function ListingGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
