import Link from "next/link";
import { Compass, Heart } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { WishlistGrid } from "@/features/listings/components/wishlist-grid";
import { WorkspaceHeader } from "@/components/common/workspace-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "My wishlist" };

/**
 * Server shell: gates access (redirects guests to sign-in) and renders the
 * heading. The saved listings themselves are fetched on the client from
 * `GET /api/favorites/listings` inside `WishlistGrid` (visible network call).
 */
export default async function WishlistPage() {
  await requireUser();

  return (
    <div className="mx-auto w-full max-w-page px-4 py-10">
      <WorkspaceHeader
        icon={Heart}
        accent="rose"
        iconClassName="fill-current"
        title="My wishlist"
        subtitle="Your saved homes, all in one place."
        action={
          <Button asChild variant="outline" className="w-fit">
            <Link href="/properties">
              <Compass className="size-4" /> Browse more homes
            </Link>
          </Button>
        }
        className="mb-8"
      />

      <WishlistGrid />
    </div>
  );
}
