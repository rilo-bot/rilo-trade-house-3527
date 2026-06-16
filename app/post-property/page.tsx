import { BadgeCheck, Building2, MessageSquare, Rocket, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { UserRole } from "@/lib/enums";
import { searchMyListings } from "@/features/listings/listings.service";
import { countLeadsByListings } from "@/features/leads/leads.repository";
import { PostPropertyCta } from "@/features/listings/components/post-property-cta";
import { PostPropertyButton } from "@/features/listings/components/post-property-button";
import { AskAssistantButton } from "@/features/assistant/components/ask-assistant-button";
import { MyListings } from "@/features/listings/components/my-listings";
import { WorkspaceHeader } from "@/components/common/workspace-header";
import { Reveal } from "@/components/common/reveal";

export const metadata = {
  title: "Sell or rent your property",
  description:
    "List your property for free on Trade House and reach thousands of verified buyers and tenants.",
};

const BENEFITS = [
  {
    icon: Wallet,
    title: "Free to list",
    body: "Post your property at no cost and start getting enquiries.",
  },
  {
    icon: Rocket,
    title: "Reach thousands",
    body: "Get your listing in front of serious buyers and tenants.",
  },
  {
    icon: MessageSquare,
    title: "Direct leads",
    body: "Chat with interested seekers and get instant lead alerts.",
  },
  {
    icon: BadgeCheck,
    title: "Verified badge",
    body: "Build trust with a verified listing that stands out.",
  },
];

export default async function PostPropertyPage() {
  const user = await getCurrentUser();
  const canManage =
    user?.role === UserRole.Owner ||
    user?.role === UserRole.Agent ||
    user?.role === UserRole.Admin;

  // Owners/agents see their own listings here so they can manage/edit them.
  // Seed only the first page — the client manager paginates (infinite scroll).
  const firstPage =
    canManage && user
      ? await searchMyListings(user, { page: 1, limit: 10 })
      : null;
  const myListings = firstPage?.items ?? [];
  const totalListings = firstPage?.total ?? 0;
  const totalPages = firstPage?.totalPages ?? 1;
  const leadCounts =
    myListings.length > 0
      ? await countLeadsByListings(myListings.map((l) => l.id))
      : {};

  // ── Owner / agent view: lead with their listings, not marketing. ──────────
  if (canManage) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:py-12">
        <WorkspaceHeader
          icon={Building2}
          accent="emerald"
          title="Your properties"
          subtitle={`${totalListings} ${
            totalListings === 1 ? "property" : "properties"
          } · edit, publish, or remove`}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <AskAssistantButton
                prompt="What makes a great property listing on Trade House? Give me tips on the title, description, photos and pricing."
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Listing tips
              </AskAssistantButton>
              <PostPropertyButton size="lg" className="w-full sm:w-auto" />
            </div>
          }
        />

        <MyListings
          initial={myListings}
          initialTotal={totalListings}
          initialTotalPages={totalPages}
          leadCounts={leadCounts}
        />

        {/* Quiet reassurance strip — secondary to the listings above. */}
        <section className="border-border grid gap-4 rounded-xl border border-dashed p-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col gap-1.5">
              <Icon className="text-primary size-5" />
              <p className="text-sm font-medium">{title}</p>
              <p className="text-muted-foreground text-xs">{body}</p>
            </div>
          ))}
        </section>
      </div>
    );
  }

  // ── Prospect view (guest / seeker): marketing pitch + CTA. ────────────────
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-12 px-4 py-16">
      <section className="flex flex-col items-center gap-5 text-center">
        <Reveal>
          <h1 className="font-display max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Sell or rent your property, faster
          </h1>
        </Reveal>
        <Reveal delay={80}>
          <p className="text-muted-foreground max-w-xl text-lg text-pretty">
            List on Trade House for free and connect directly with thousands of
            verified buyers and tenants.
          </p>
        </Reveal>
        <Reveal delay={150}>
          <PostPropertyCta role={user?.role ?? null} />
        </Reveal>
      </section>

      <Reveal delay={220} className="w-full">
        <section className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="border-border bg-card shadow-soft flex flex-col gap-2 rounded-2xl border p-5"
            >
              <Icon className="text-primary size-6" />
              <p className="font-medium">{title}</p>
              <p className="text-muted-foreground text-sm">{body}</p>
            </div>
          ))}
        </section>
      </Reveal>
    </div>
  );
}
