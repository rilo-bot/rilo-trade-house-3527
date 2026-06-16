import Link from "next/link";
import { BellRing, Compass } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { SavedSearchesList } from "@/features/saved-searches/components/saved-searches-list";
import { WorkspaceHeader } from "@/components/common/workspace-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Saved searches" };

/**
 * Server shell: gates access (redirects guests to sign-in) and renders the
 * heading. The saved searches are fetched client-side from
 * `GET /api/saved-searches` inside `SavedSearchesList`.
 */
export default async function SavedSearchesPage() {
  await requireUser();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <WorkspaceHeader
        icon={BellRing}
        accent="violet"
        title="Saved searches"
        subtitle="Re-run a search any time, and get emailed when new homes match."
        action={
          <Button asChild variant="outline" className="w-fit">
            <Link href="/properties">
              <Compass className="size-4" /> Browse homes
            </Link>
          </Button>
        }
        className="mb-8"
      />

      <SavedSearchesList />
    </div>
  );
}
