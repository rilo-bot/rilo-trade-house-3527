import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Info, Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Reveal } from "@/components/common/reveal";
import { Button } from "@/components/ui/button";
import { GuideJourney } from "@/features/guides/components/guide-journey";
import { GuideTopics } from "@/features/guides/components/guide-topics";
import { GuideFacts } from "@/features/guides/components/guide-facts";
import { GuideChecklists } from "@/features/guides/components/guide-checklists";
import { GuideFaqSection } from "@/features/guides/components/guide-faq";
import {
  rentingChecklists,
  rentingFacts,
  rentingFaqs,
  rentingJourney,
  rentingTopics,
} from "@/features/guides/guides.data";

export const metadata: Metadata = {
  title: "Renting guides",
  description:
    "Practical, plain-English renting guides for New Zealand tenants — viewing checklists, application tips, bond and rent basics, your rights, and moving in.",
};

export default function RentingGuidesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Renting guides"
        title="Renting made simple"
        subtitle="Everything a New Zealand tenant needs — from spotting the right place at a viewing to understanding your bond, your rights, and a smooth move-in day."
        actions={
          <Button asChild size="lg">
            <Link href="/rent">
              Browse rentals
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <GuideJourney
        heading="How renting works"
        subtitle="Five simple stages from first search to settling in — here's what to expect at each one."
        steps={rentingJourney}
      />
      <GuideTopics
        heading="Guides for every step"
        subtitle="Quick, practical reads covering the things tenants ask about most."
        topics={rentingTopics}
      />
      <GuideFacts
        heading="Renting in New Zealand at a glance"
        subtitle="The headline rules that protect tenants — good to know before you sign anything."
        facts={rentingFacts}
      />
      <GuideChecklists
        heading="Handy checklists"
        subtitle="Print them, screenshot them, or keep them open on your phone — so nothing slips through."
        checklists={rentingChecklists}
      />
      <GuideFaqSection
        heading="Renting questions, answered"
        subtitle="The essentials every New Zealand tenant should know."
        faqs={rentingFaqs}
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
              Ready to find your next rental?
            </h2>
            <p className="text-primary-foreground/85 relative max-w-xl text-pretty">
              Browse verified rentals across New Zealand, or find a room and the
              right flatmates to share with.
            </p>
            <div className="relative flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-background text-primary hover:bg-background/90 rounded-full px-6 font-semibold shadow-sm"
              >
                <Link href="/rent">
                  Browse rentals
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-primary-foreground rounded-full border-white/30 bg-transparent px-6 hover:bg-white/10 hover:text-primary-foreground"
              >
                <Link href="/flatmates">
                  <Users className="size-4" />
                  Find flatmates
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>

        {/* Honesty disclaimer — point tenants to the authoritative source. */}
        <p className="text-muted-foreground mx-auto mt-6 flex max-w-2xl items-start justify-center gap-1.5 text-center text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span className="text-pretty">
            This is general guidance, not legal advice. Tenancy rules can change
            — for the current law and official forms, see{" "}
            <a
              href="https://www.tenancy.govt.nz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-0.5 font-medium hover:underline"
            >
              Tenancy Services
              <ExternalLink className="size-3" />
            </a>
            .
          </span>
        </p>
      </section>
    </div>
  );
}
