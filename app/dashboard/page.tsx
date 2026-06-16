import Link from "next/link";
import {
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  MessageSquare,
} from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { LeadKind, LeadStatus, ListingStatus, UserRole } from "@/lib/enums";
import {
  activeListingLimitFor,
  listMyListings,
} from "@/features/listings/listings.service";
import { listOwnerLeads } from "@/features/leads/leads.service";
import { countFavoritesByListings } from "@/features/favorites/favorites.repository";
import { LEAD_STATUS_BADGE, LEAD_STATUS_LABELS } from "@/features/leads/lead-labels";
import { PostPropertyButton } from "@/features/listings/components/post-property-button";
import { AskAssistantButton } from "@/features/assistant/components/ask-assistant-button";
import { StatCard } from "@/components/dashboard/stat-card";
import { Reveal } from "@/components/common/reveal";

export const metadata = { title: "Dashboard" };

/** Compact "2h ago" / "3d ago" relative time for the activity feed. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

export default async function DashboardPage() {
  // Owners and agents (and admins) can reach the listing dashboard.
  const user = await requireRole([UserRole.Owner, UserRole.Agent, UserRole.Admin]);
  const [listings, leads] = await Promise.all([
    listMyListings(user),
    listOwnerLeads(user),
  ]);

  const saveCounts = await countFavoritesByListings(listings.map((l) => l.id));
  const totalSaves = Object.values(saveCounts).reduce((a, b) => a + b, 0);

  const activeCount = listings.filter((l) => l.status === ListingStatus.Active).length;
  const draftCount = listings.filter((l) => l.status === ListingStatus.Draft).length;
  const activeLimit = activeListingLimitFor(user);
  // Slots count active + pending-review, matching the create-time limit check.
  const slotsUsed = listings.filter(
    (l) =>
      l.status === ListingStatus.Active ||
      l.status === ListingStatus.PendingReview,
  ).length;

  const newLeads = leads.filter((l) => l.status === LeadStatus.New).length;
  const contactedLeads = leads.filter((l) => l.status === LeadStatus.Contacted).length;
  const wonLeads = leads.filter((l) => l.status === LeadStatus.ClosedWon).length;
  const viewingRequests = leads.filter((l) => l.kind === LeadKind.Viewing).length;

  const recentLeads = leads.slice(0, 5);

  // "Needs attention" items — only the ones that actually apply right now.
  const attention = [
    newLeads > 0 && {
      icon: Bell,
      text: `${newLeads} new ${newLeads === 1 ? "enquiry" : "enquiries"} waiting for a reply`,
      href: "/dashboard/leads",
    },
    draftCount > 0 && {
      icon: FileText,
      text: `${draftCount} ${draftCount === 1 ? "draft is" : "drafts are"} not published yet`,
      href: "/dashboard/listings",
    },
    Number.isFinite(activeLimit) &&
      activeCount >= activeLimit && {
        icon: Building2,
        text: `You've used all ${activeLimit} active listing slots`,
        href: "/dashboard/listings",
      },
  ].filter(Boolean) as { icon: typeof Bell; text: string; href: string }[];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      {/* Greeting + primary action. */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            <span className="text-primary capitalize">{user.role}</span> dashboard
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here&apos;s how your properties are performing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AskAssistantButton
            prompt="Give me a quick summary of how my listings and leads are doing, and anything that needs my attention."
            variant="outline"
            size="lg"
          >
            Ask about my listings
          </AskAssistantButton>
          <PostPropertyButton size="lg" />
        </div>
      </header>

      {/* Engagement stats. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal delay={0}>
          <StatCard
            icon={Building2}
            accent="primary"
            label="Total listings"
            value={listings.length}
            hint={`${activeCount} active · ${draftCount} draft`}
            progress={
              Number.isFinite(activeLimit)
                ? { value: slotsUsed, max: activeLimit }
                : undefined
            }
            href="/dashboard/listings"
            cta="Manage listings"
          />
        </Reveal>
        <Reveal delay={80}>
          <StatCard
            icon={MessageSquare}
            accent="violet"
            label="Total leads"
            value={leads.length}
            pill={newLeads > 0 ? `${newLeads} new` : undefined}
            hint={`${contactedLeads} contacted · ${wonLeads} won`}
            href="/dashboard/leads"
            cta="View leads"
          />
        </Reveal>
        <Reveal delay={160}>
          <StatCard
            icon={Bookmark}
            accent="emerald"
            label="Saves on your listings"
            value={totalSaves}
            hint="seekers who shortlisted you"
          />
        </Reveal>
        <Reveal delay={240}>
          <StatCard
            icon={CalendarClock}
            accent="amber"
            label="Viewing requests"
            value={viewingRequests}
            hint="across all enquiries"
          />
        </Reveal>
      </div>

      {/* Activity + things to do. */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent leads. */}
        <Reveal className="lg:col-span-2" delay={0}>
          <section className="border-border bg-card shadow-soft h-full rounded-2xl border p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Recent enquiries</h2>
              {leads.length > 0 && (
                <Link
                  href="/dashboard/leads"
                  className="text-primary text-sm font-medium hover:underline"
                >
                  View all
                </Link>
              )}
            </div>

            {recentLeads.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center">
                <MessageSquare className="size-8 opacity-40" />
                <p className="text-sm">
                  No enquiries yet. They&apos;ll appear here as seekers reach out.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-border divide-y">
                {recentLeads.map((l) => (
                  <li key={l.id}>
                    <Link
                      href="/dashboard/leads"
                      className="hover:bg-muted/50 -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors"
                    >
                      <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold uppercase">
                        {l.name.slice(0, 2)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium">{l.name}</p>
                          {l.kind === LeadKind.Viewing && (
                            <CalendarClock className="size-3.5 shrink-0 text-violet-500" />
                          )}
                        </div>
                        <p className="text-muted-foreground truncate text-xs">
                          {l.listingTitle}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-medium ${LEAD_STATUS_BADGE[l.status]}`}
                        >
                          {LEAD_STATUS_LABELS[l.status]}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {relativeTime(l.createdAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>

        {/* Needs attention. */}
        <Reveal delay={120}>
          <section className="border-border bg-card shadow-soft flex h-full flex-col rounded-2xl border p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Needs attention</h2>
            {attention.length === 0 ? (
              <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-500" />
                <p className="text-sm">You&apos;re all caught up.</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {attention.map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href}
                      className="border-border hover:border-primary/40 hover:bg-accent/50 flex items-start gap-3 rounded-xl border p-3 transition-colors"
                    >
                      <span className="bg-primary/10 text-primary mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg">
                        <item.icon className="size-4" />
                      </span>
                      <span className="text-sm">{item.text}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}
