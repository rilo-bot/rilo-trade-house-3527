import Link from "next/link";
import { Compass, MessageSquare } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { listSeekerLeads } from "@/features/leads/leads.service";
import { getListingSummaries } from "@/features/listings/listings.service";
import { EnquiriesList } from "@/features/leads/components/enquiries-list";
import { AskAssistantButton } from "@/features/assistant/components/ask-assistant-button";
import { WorkspaceHeader } from "@/components/common/workspace-header";
import { Reveal } from "@/components/common/reveal";
import { Button } from "@/components/ui/button";

export const metadata = { title: "My enquiries" };

export default async function EnquiriesPage() {
  const user = await requireUser();
  const leads = await listSeekerLeads(user);
  // Cover image + current status per enquired listing — for thumbnails and to
  // avoid linking to sold/removed properties.
  const summaries = await getListingSummaries([
    ...new Set(leads.map((l) => l.listingId)),
  ]);

  const count = leads.length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <WorkspaceHeader
        icon={MessageSquare}
        accent="primary"
        title="My enquiries"
        subtitle={
          count > 0
            ? `${count} ${count === 1 ? "property" : "properties"} you've reached out about`
            : "Properties you've reached out about"
        }
        action={
          <Button asChild variant="outline" className="w-fit">
            <Link href="/properties">
              <Compass className="size-4" /> Browse properties
            </Link>
          </Button>
        }
        className="mb-8"
      />

      {count === 0 ? (
        <Reveal delay={80}>
          <div className="border-border bg-card/50 flex flex-col items-center gap-4 rounded-2xl border border-dashed p-14 text-center">
            <div className="bg-primary/10 grid size-16 place-items-center rounded-full">
              <MessageSquare className="text-primary size-8" />
            </div>
            <div>
              <p className="text-lg font-semibold">No enquiries yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                When you contact an owner about a property, it&apos;ll show up
                here so you can track their replies.
              </p>
            </div>
            <div className="mt-1 flex flex-col items-center gap-2 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/properties">Browse properties</Link>
              </Button>
              <AskAssistantButton
                prompt="Help me find a property to enquire about — ask me what I'm looking for."
                variant="ghost"
                size="lg"
              >
                Ask the assistant
              </AskAssistantButton>
            </div>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={80}>
          <EnquiriesList initial={leads} summaries={summaries} />
        </Reveal>
      )}
    </div>
  );
}
