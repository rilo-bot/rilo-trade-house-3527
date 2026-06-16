import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gavel, Info } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { listingQuerySchema } from "@/features/listings/listings.schema";
import { searchPublicListings } from "@/features/listings/listings.service";
import { AUCTION_LIVE_MS, toNzWallClock } from "@/features/auctions/auction-window";
import { ensureDemoAuctionLive } from "@/features/auctions/auctions.service";
import { AuctionLists } from "@/features/auctions/components/auction-lists";
import { PageHeader } from "@/components/common/page-header";
import { Reveal } from "@/components/common/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Live auctions",
  description:
    "Property auctions happening now and coming up across New Zealand, plus how auctions work and what to know before you bid.",
};

// Results depend on the current time (live vs upcoming), so never statically cache.
export const dynamic = "force-dynamic";

/** NZ auction essentials — shown in the "How auctions work" section. */
const AUCTION_RULES: { title: string; body: string }[] = [
  {
    title: "Sales are unconditional",
    body: "When the hammer falls the highest bidder is bound on the spot — there's no cooling-off and no 'subject to finance/builder's report'. Do your due diligence first.",
  },
  {
    title: "Do your homework early",
    body: "Arrange finance pre-approval and review the LIM, title and building report before auction day. Get your lawyer across the contract beforehand.",
  },
  {
    title: "There's a reserve",
    body: "The vendor sets a confidential reserve. Once bidding passes it the property is 'on the market' and will sell; if it doesn't reach reserve it's 'passed in' and negotiation follows.",
  },
  {
    title: "Register to bid",
    body: "Register before the auction so the agent can confirm you. You can usually bid in the room, by phone, or online.",
  },
  {
    title: "Pay the deposit on the day",
    body: "The successful bidder pays a deposit (often 10%) immediately on the fall of the hammer, with settlement on the agreed date.",
  },
  {
    title: "Pre-auction offers",
    body: "Vendors may consider offers before auction day, which can bring the auction forward — ask the agent if you're keen.",
  },
];

export default async function AuctionsPage() {
  const user = await getCurrentUser();
  const now = new Date();

  // Keep the seeded demo auction in the live window so it always shows under
  // "Live now" (no-op when there's no demo or it's already live).
  await ensureDemoAuctionLive(now);

  // Live = started within the last hour; upcoming = still to come. Both sorted
  // soonest-first. Bounds are NZ wall-clock to match how `price.auctionDate` is
  // stored, so the split is correct on any host timezone (prod is UTC). (See
  // features/auctions/auction-window.ts.)
  const liveQuery = listingQuerySchema.parse({
    minAuctionDate: toNzWallClock(new Date(now.getTime() - AUCTION_LIVE_MS)),
    maxAuctionDate: toNzWallClock(now),
    sort: "auction_soonest",
    limit: 24,
  });
  const upcomingQuery = listingQuerySchema.parse({
    minAuctionDate: toNzWallClock(now),
    sort: "auction_soonest",
    limit: 24,
  });

  const [live, upcoming] = await Promise.all([
    searchPublicListings(liveQuery, user ?? undefined),
    searchPublicListings(upcomingQuery, user ?? undefined),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Auctions"
        title="Live property auctions"
        subtitle="See what's going under the hammer now and what's coming up across New Zealand — then register to bid."
        actions={
          <Button asChild size="lg" variant="outline">
            <Link href="#rules">
              How auctions work
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      {/* Live now + Upcoming — self-refreshing (no manual reload needed): the
          client re-polls every ~15s so a listing crosses Upcoming → Live, and
          newly-published auctions appear, on their own. */}
      <AuctionLists
        initialLive={live.items}
        initialUpcoming={upcoming.items}
        currentUserId={user?.id}
      />

      {/* Info & rules */}
      <section id="rules" className="bg-accent border-border scroll-mt-20 border-t">
        <div className="mx-auto w-full max-w-page px-4 py-12 sm:py-16">
          <Reveal>
            <div className="flex flex-col gap-2">
              <span className="text-primary text-sm font-semibold tracking-wide uppercase">
                How auctions work
              </span>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                What to know before you bid
              </h2>
              <p className="text-muted-foreground max-w-2xl text-pretty">
                Auctions are a fast, transparent way to buy and sell in New
                Zealand — but they come with rules that differ from a normal
                negotiated sale.
              </p>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AUCTION_RULES.map((rule, i) => (
              <Reveal key={rule.title} delay={(i % 3) * 80}>
                <div className="border-border bg-card shadow-soft flex h-full flex-col gap-2 rounded-2xl border p-5">
                  <Gavel className="text-primary size-5" />
                  <h3 className="font-semibold">{rule.title}</h3>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {rule.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="border-border text-muted-foreground mt-6 flex items-start gap-2 rounded-xl border border-dashed bg-card/50 px-4 py-3 text-sm">
            <Info className="text-primary mt-0.5 size-4 shrink-0" />
            <span>
              Any online bidding shown on Trade House is{" "}
              <strong className="text-foreground">indicative and non-binding</strong>{" "}
              — the formal auction is run by the listing agent under the
              vendor&apos;s terms. Always confirm details with the agent.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
