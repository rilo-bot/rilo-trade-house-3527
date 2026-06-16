import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Home, Info, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Reveal } from "@/components/common/reveal";
import { Button } from "@/components/ui/button";
import { GuideJourney } from "@/features/guides/components/guide-journey";
import { GuideTopics } from "@/features/guides/components/guide-topics";
import { GuideFacts } from "@/features/guides/components/guide-facts";
import { GuideChecklists } from "@/features/guides/components/guide-checklists";
import { GuideFaqSection } from "@/features/guides/components/guide-faq";
import {
  buyingChecklists,
  buyingFacts,
  buyingFaqs,
  buyingJourney,
  buyingTopics,
} from "@/features/guides/guides.data";

export const metadata: Metadata = {
  title: "Buying & renting guides",
  description:
    "Plain-English guides for buying and renting a home in New Zealand — the journey explained, key facts, practical checklists and answers to common questions.",
};

export default function GuidesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Buying & renting guides"
        title="Guides for every step of the journey"
        subtitle="Whether you're buying your first home or finding your next rental, here's everything you need in plain English — the process, the costs, and the things people wish they'd known."
        actions={
          <Button asChild size="lg">
            <Link href="/buy">
              Browse homes
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      {/* Choose your path — buying (this page) or renting (dedicated guide). */}
      <section className="mx-auto w-full max-w-page px-4 py-12 sm:py-16">
        <Reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Buying — the current page. */}
            <div className="border-primary/30 bg-primary/5 ring-primary/10 relative flex flex-col gap-3 rounded-2xl border p-6 ring-1">
              <div className="flex items-center gap-3">
                <span className="from-primary to-primary-hover text-primary-foreground grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br shadow-sm">
                  <Home className="size-5" />
                </span>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  Buying a home
                </h2>
              </div>
              <p className="text-muted-foreground text-sm text-pretty">
                From working out your deposit to settlement day — the full
                buying journey, explained below.
              </p>
              <span className="text-primary mt-auto text-xs font-semibold tracking-wide uppercase">
                You&apos;re reading this
              </span>
            </div>

            {/* Renting — links to the dedicated renting guides page. */}
            <Link
              href="/rent/guides"
              className="group border-border bg-card shadow-soft hover:shadow-md flex flex-col gap-3 rounded-2xl border p-6 transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <div className="flex items-center gap-3">
                <span className="bg-accent text-primary grid size-11 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:-translate-y-0.5">
                  <KeyRound className="size-5" />
                </span>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  Renting a home
                </h2>
              </div>
              <p className="text-muted-foreground text-sm text-pretty">
                Viewing checklists, bond and rent basics, your rights as a
                tenant, and a smooth move-in day.
              </p>
              <span className="text-primary mt-auto inline-flex items-center gap-1 text-sm font-medium">
                Read the renting guides
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </Reveal>
      </section>

      <GuideJourney
        heading="How buying works"
        subtitle="Five stages from saving your deposit to picking up the keys — here's what to expect at each one."
        steps={buyingJourney}
      />
      <GuideTopics
        heading="Guides for every step"
        subtitle="Quick, practical reads covering the things buyers ask about most."
        topics={buyingTopics}
      />
      <GuideFacts
        heading="Buying in New Zealand at a glance"
        subtitle="The basics worth knowing before you start house-hunting."
        facts={buyingFacts}
      />
      <GuideChecklists
        heading="Handy checklists"
        subtitle="Print them, screenshot them, or keep them open on your phone — so nothing slips through."
        checklists={buyingChecklists}
      />
      <GuideFaqSection
        heading="Buying questions, answered"
        subtitle="The essentials every New Zealand home buyer should know."
        faqs={buyingFaqs}
      />

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-page px-4 pb-16 sm:pb-20">
        <Reveal>
          <div className="from-primary-hover to-primary text-primary-foreground shadow-soft relative flex flex-col items-center gap-5 overflow-hidden rounded-3xl bg-linear-to-br p-8 text-center sm:p-12">
            {/* Soft glows for depth. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -top-16 -left-10 size-56 rounded-full bg-white/10 blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -bottom-20 size-64 rounded-full bg-white/10 blur-3xl"
            />
            <h2 className="font-display relative text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Ready to find your next home?
            </h2>
            <p className="text-primary-foreground/85 relative max-w-xl text-pretty">
              Browse verified homes for sale across New Zealand — or read up on
              renting if you&apos;re not buying just yet.
            </p>
            <div className="relative flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-background text-primary hover:bg-background/90 rounded-full px-6 font-semibold shadow-sm"
              >
                <Link href="/buy">
                  Browse homes for sale
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-primary-foreground rounded-full border-white/30 bg-transparent px-6 hover:bg-white/10 hover:text-primary-foreground"
              >
                <Link href="/rent/guides">
                  <KeyRound className="size-4" />
                  Renting guides
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>

        {/* Honesty disclaimer — point buyers to the authoritative source. */}
        <p className="text-muted-foreground mx-auto mt-6 flex max-w-2xl items-start justify-center gap-1.5 text-center text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span className="text-pretty">
            This is general guidance, not legal or financial advice. Rules and
            schemes can change — for the official buying process and your
            rights, see{" "}
            <a
              href="https://www.settled.govt.nz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-0.5 font-medium hover:underline"
            >
              Settled.govt.nz
              <ExternalLink className="size-3" />
            </a>
            .
          </span>
        </p>
      </section>
    </div>
  );
}
