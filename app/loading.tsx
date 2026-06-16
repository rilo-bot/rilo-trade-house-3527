/**
 * Route-level loading UI, shown via Suspense while a segment streams in. A
 * neutral skeleton (header + card grid) rather than a spinner, so navigation
 * reads as content arriving — works for the browse/dashboard/list pages that
 * make up most routes. The landing page streams its own per-section skeletons.
 */
export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-page px-4 py-10"
      role="status"
      aria-label="Loading"
    >
      <div className="bg-muted h-9 w-56 max-w-full animate-pulse rounded-lg" />
      <div className="bg-muted mt-3 h-4 w-80 max-w-full animate-pulse rounded" />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-card shadow-soft space-y-3 rounded-2xl border p-4"
          >
            <div className="bg-muted aspect-4/3 animate-pulse rounded-xl" />
            <div className="bg-muted h-5 w-2/3 animate-pulse rounded" />
            <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
