/**
 * Placeholder shown while an auth form resolves its Suspense boundary (the forms
 * read `useSearchParams`, which defers them on the server). Mirrors the form's
 * shape so the column doesn't flash empty before the real form paints.
 */
export function AuthFormSkeleton() {
  return (
    <div className="animate-pulse space-y-7" aria-hidden>
      <div className="space-y-3">
        <div className="bg-muted h-9 w-3/5 rounded-lg" />
        <div className="bg-muted h-4 w-4/5 rounded-md" />
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="bg-muted h-4 w-24 rounded-md" />
          <div className="bg-muted h-12 w-full rounded-xl" />
        </div>
        <div className="bg-muted h-12 w-full rounded-xl" />
      </div>
      <div className="bg-muted mx-auto h-4 w-1/2 rounded-md" />
    </div>
  );
}
