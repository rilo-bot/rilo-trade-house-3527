import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { UserRole } from "@/lib/enums";
import {
  activeListingLimitFor,
  countMyActiveListings,
  searchMyListings,
} from "@/features/listings/listings.service";
import {
  countLeadsByListings,
} from "@/features/leads/leads.repository";
import { countFavoritesByListings } from "@/features/favorites/favorites.repository";
import { MyListings } from "@/features/listings/components/my-listings";
import { PostPropertyButton } from "@/features/listings/components/post-property-button";

export const metadata = { title: "My listings" };

export default async function MyListingsPage() {
  const user = await requireRole([UserRole.Owner, UserRole.Agent, UserRole.Admin]);
  const firstPage = await searchMyListings(user, { page: 1, limit: 10 });
  const ids = firstPage.items.map((l) => l.id);
  const [leadCounts, saveCounts, activeCount] = await Promise.all([
    countLeadsByListings(ids),
    countFavoritesByListings(ids),
    countMyActiveListings(user),
  ]);
  const activeLimit = activeListingLimitFor(user);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> Dashboard
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">My listings</h1>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span>
              {firstPage.total} {firstPage.total === 1 ? "property" : "properties"}
            </span>
            {Number.isFinite(activeLimit) && (
              <>
                <span aria-hidden>·</span>
                <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                  <Building2 className="size-3" />
                  {activeCount} of {activeLimit} active slots used
                </span>
              </>
            )}
          </p>
        </div>
        <PostPropertyButton />
      </div>

      <MyListings
        initial={firstPage.items}
        initialTotal={firstPage.total}
        initialTotalPages={firstPage.totalPages}
        leadCounts={leadCounts}
        saveCounts={saveCounts}
      />
    </div>
  );
}
