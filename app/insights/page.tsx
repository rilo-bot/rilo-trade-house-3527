import type { Metadata } from "next";
import Link from "next/link";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { getSuburbInsights } from "@/features/insights/insights.service";
import { Reveal } from "@/components/common/reveal";
import { InsightsSelector } from "@/features/insights/components/insights-selector";
import { AskAssistantButton } from "@/features/assistant/components/ask-assistant-button";
import { AssistantContextSetter } from "@/features/assistant/components/assistant-context-setter";
import { PriceTrendChart } from "@/features/insights/components/price-trend-chart";
import { SalesVolumeChart } from "@/features/insights/components/sales-volume-chart";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Suburb insights" };

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const region = typeof sp.region === "string" ? sp.region : undefined;
  const suburb = typeof sp.suburb === "string" ? sp.suburb : undefined;
  const data = await getSuburbInsights(region, suburb);

  return (
    <div>
      {/* Let the assistant answer "tell me about this area" without re-asking. */}
      <AssistantContextSetter suburb={data.suburb} region={data.region} />

      {/* Header + suburb selector */}
      <section className="bg-accent border-border border-b">
        <div className="mx-auto w-full max-w-page px-4 py-10 sm:py-12">
          <Reveal>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-primary text-sm font-semibold tracking-wide uppercase">
                  Market insights
                </span>
                <h1 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  Suburb insights — {data.suburb}, {data.region}
                </h1>
                <p className="text-muted-foreground max-w-2xl text-pretty">
                  Indicative suburb market data, derived from current listings
                  and enquiries.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <InsightsSelector region={data.region} suburb={data.suburb} />
                <AskAssistantButton
                  prompt={`Tell me about the ${data.suburb} property market — is it a good place to buy or rent right now?`}
                  context={{ suburb: data.suburb, region: data.region }}
                  variant="outline"
                  size="sm"
                >
                  Ask about {data.suburb}
                </AskAssistantButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto w-full max-w-page px-4 py-10">
        {/* KPI cards */}
        <Reveal>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {data.kpis.map((k) => (
              <div
                key={k.label}
                className="bg-card border-border shadow-soft rounded-2xl border p-5"
              >
                <p className="text-muted-foreground flex items-center gap-0.5 text-xs font-medium tracking-wide uppercase">
                  {k.label}
                  {k.indicative && (
                    <span
                      title="Indicative estimate"
                      className="text-muted-foreground/60"
                    >
                      *
                    </span>
                  )}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  {k.value}
                </p>
                {k.delta != null ? (
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1 text-xs font-medium",
                      k.delta >= 0 ? "text-emerald-600" : "text-destructive",
                    )}
                  >
                    {k.delta >= 0 ? (
                      <TrendingUp className="size-3.5" />
                    ) : (
                      <TrendingDown className="size-3.5" />
                    )}
                    {Math.abs(k.delta)}% past 12 months
                  </p>
                ) : k.sub ? (
                  <p className="text-muted-foreground mt-1 text-xs">{k.sub}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Charts */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Reveal>
            <div className="bg-card border-border shadow-soft h-full rounded-2xl border p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">
                  Median sale price — 12 months{" "}
                  <span className="text-muted-foreground/70 text-xs font-normal">
                    · indicative
                  </span>
                </h2>
                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="bg-primary h-0.5 w-4 rounded-full" />
                    {data.suburb}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="bg-muted-foreground/60 h-0.5 w-4 rounded-full" />
                    Region
                  </span>
                </div>
              </div>
              <PriceTrendChart data={data.priceTrend} suburb={data.suburb} />
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="bg-card border-border shadow-soft h-full rounded-2xl border p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">
                  New listings per month
                </h2>
                <span className="text-muted-foreground text-xs">
                  {data.volumeReal
                    ? "last 12 months"
                    : "indicative · last 12 months"}
                </span>
              </div>
              <SalesVolumeChart data={data.volume} />
            </div>
          </Reveal>
        </div>

        {/* Nearby suburbs */}
        <Reveal>
          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              How nearby suburbs compare
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Tap a suburb&apos;s listings to browse what&apos;s on the market.
            </p>
            <div className="border-border mt-4 overflow-hidden rounded-2xl border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm sm:min-w-160">
                  <thead>
                    <tr className="text-muted-foreground border-border border-b text-left text-xs tracking-wide uppercase">
                      <th className="px-4 py-3 font-medium">Suburb</th>
                      <th className="px-4 py-3 font-medium">Median value*</th>
                      <th className="px-4 py-3 font-medium">12-mo change*</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Median rent
                      </th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Days on market
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        For sale now
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.nearby.map((row) => (
                      <tr
                        key={row.suburb}
                        className={cn(
                          "border-border border-b last:border-0",
                          row.current && "bg-accent/50",
                        )}
                      >
                        <td className="px-4 py-3 font-medium">{row.suburb}</td>
                        <td className="px-4 py-3">{row.medianValue}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <TrendingUp className="size-3.5" />
                            {row.changePct}%
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {row.medianRent}
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          {row.daysOnMarket}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/properties?region=${encodeURIComponent(data.region)}&q=${encodeURIComponent(row.suburb)}`}
                            className="text-primary font-medium hover:underline"
                          >
                            {row.forSaleNow} listings
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </Reveal>

        {/* Honesty disclaimer */}
        <p className="text-muted-foreground mt-6 flex items-start gap-1.5 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Figures marked <span className="font-medium">*</span> (median value,
            12-month change, buyer demand) are indicative estimates — the
            platform doesn&apos;t hold sold-price or historical data yet.
            For-sale counts, asking rent, days listed and new-listings volume are
            derived from current listings.
          </span>
        </p>
      </div>
    </div>
  );
}
