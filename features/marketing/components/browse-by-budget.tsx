import Link from "next/link";
import { Reveal } from "@/components/common/reveal";
import { buyBudgets, rentBudgets, type BudgetRange } from "../marketing.data";
import { SectionHeading } from "./section-heading";

function BudgetRow({
  title,
  ranges,
}: {
  title: string;
  ranges: readonly BudgetRange[];
}) {
  return (
    <div>
      <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
        {title}
      </h3>
      <div className="flex flex-wrap gap-3">
        {ranges.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="border-border bg-card shadow-soft hover:border-primary/40 hover:text-primary rounded-full border px-5 py-2.5 text-sm font-medium transition-colors"
          >
            {r.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * "Find a home in your budget" — price-range quick-filter chips for buying and
 * renting, each deep-linking into filtered browse results. Sits on a tinted
 * band to break up the page rhythm.
 */
export function BrowseByBudget() {
  return (
    <section className="bg-accent border-border border-y">
      <div className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
        <Reveal>
          <SectionHeading
            title="Find a home in your budget"
            subtitle="Pick a price range and see what's on the market."
            className="mb-10"
          />
        </Reveal>
        <Reveal delay={80}>
          <div className="flex flex-col gap-8">
            <BudgetRow title="To buy" ranges={buyBudgets} />
            <BudgetRow title="To rent" ranges={rentBudgets} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
