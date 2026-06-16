import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/common/reveal";
import { DEFAULT_REGION, suburbsForRegion } from "@/features/insights/insights.data";

/**
 * Cross-sell band for the /insights feature: a navy card with a few real
 * suburbs (from the NZ dataset) that deep-link into their suburb insights.
 */
export function InsightsTeaser() {
  const suburbs = suburbsForRegion(DEFAULT_REGION).slice(0, 5);

  return (
    <section className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
      <Reveal>
        <div className="bg-brand text-brand-foreground relative overflow-hidden rounded-3xl px-6 py-12 sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="bg-primary/30 pointer-events-none absolute -top-24 -right-16 size-72 rounded-full blur-3xl"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <span className="text-brand-foreground/70 text-sm font-semibold tracking-wide uppercase">
                Market insights
              </span>
              <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                Know the market before you move
              </h2>
              <p className="text-brand-foreground/80 max-w-md text-pretty">
                Median values, price trends, asking rents and buyer demand 
                suburb by suburb, so you can make your next move with confidence.
              </p>
              <Button asChild size="lg" variant="secondary" className="w-fit">
                <Link href="/insights">
                  Explore suburb insights
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="flex flex-col gap-2.5">
              {suburbs.map((s) => (
                <Link
                  key={s}
                  href={`/insights?region=${encodeURIComponent(
                    DEFAULT_REGION,
                  )}&suburb=${encodeURIComponent(s)}`}
                  className="bg-brand-foreground/10 hover:bg-brand-foreground/15 flex items-center justify-between gap-3 rounded-xl px-4 py-3 backdrop-blur-sm transition-colors"
                >
                  <span className="font-medium">{s}</span>
                  <span className="text-brand-foreground/70 flex items-center gap-1 text-sm">
                    <TrendingUp className="size-4" /> View trends
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
