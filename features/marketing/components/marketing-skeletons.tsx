/**
 * Skeleton fallbacks for the landing page's async (DB-backed) sections, used as
 * `<Suspense>` fallbacks so the rest of the page renders immediately while
 * these stream in — no full-page spinner. Each mirrors its section's layout so
 * the page doesn't shift when real content arrives.
 */

/** Matches the "Everything you need" photographic bento. */
export function QuickActionsSkeleton() {
  return (
    <section
      className="mx-auto w-full max-w-page px-4 py-16 sm:py-20"
      role="status"
      aria-label="Loading"
    >
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="bg-muted h-8 w-72 max-w-full animate-pulse rounded" />
        <div className="bg-muted h-4 w-96 max-w-full animate-pulse rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:auto-rows-[14rem] lg:grid-cols-4 lg:gap-5 xl:auto-rows-[16rem]">
        <div className="bg-muted min-h-56 animate-pulse rounded-2xl sm:min-h-64 lg:col-span-2 lg:row-span-2" />
        <div className="bg-muted min-h-36 animate-pulse rounded-2xl sm:min-h-38" />
        <div className="bg-muted min-h-36 animate-pulse rounded-2xl sm:min-h-38" />
        <div className="bg-muted min-h-36 animate-pulse rounded-2xl sm:min-h-38 lg:col-span-2" />
      </div>
    </section>
  );
}

/** Matches the "Browse by property type" tile grid. */
export function BrowseByTypeSkeleton() {
  return (
    <section
      className="mx-auto w-full max-w-page px-4 py-16 sm:py-20"
      role="status"
      aria-label="Loading"
    >
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="bg-muted h-8 w-64 max-w-full animate-pulse rounded" />
        <div className="bg-muted h-4 w-80 max-w-full animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted h-32 animate-pulse rounded-2xl"
          />
        ))}
      </div>
    </section>
  );
}

/** Matches the "Explore top cities" tinted band + 4-up photo grid. */
export function TopCitiesSkeleton() {
  return (
    <section className="bg-accent" role="status" aria-label="Loading">
      <div className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
        <div className="mb-10 flex flex-col gap-3">
          <div className="bg-muted h-8 w-80 max-w-full animate-pulse rounded" />
          <div className="bg-muted h-4 w-96 max-w-full animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted aspect-4/3 animate-pulse rounded-2xl"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
