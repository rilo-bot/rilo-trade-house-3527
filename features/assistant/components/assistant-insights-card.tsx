import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertMessage } from "@/components/common/alert-message";
import { cn } from "@/lib/utils";

export type InsightKpi = {
  label: string;
  value: string;
  note?: string | null;
  changePct?: number | null;
  indicative?: boolean;
};

/** Payload the assistant's `getMarketInsights` tool returns. */
export type AssistantInsights = {
  region: string;
  suburb: string;
  hasLiveData: boolean;
  kpis: InsightKpi[];
  nearbySuburbs?: { suburb: string }[] | string[];
};

/** Accept either the raw nearby objects or plain strings. */
function nearbyNames(
  nearby: AssistantInsights["nearbySuburbs"],
): string[] {
  if (!nearby) return [];
  return nearby.map((n) => (typeof n === "string" ? n : n.suburb));
}

/**
 * Compact market-insights card for the chat. Real metrics and INDICATIVE
 * estimates are visually distinguished — estimates get a dashed tile + an "Est."
 * pill so the data-honesty stance from the insights page carries into chat.
 */
export function AssistantInsightsCard({ data }: { data: AssistantInsights }) {
  const nearby = nearbyNames(data.nearbySuburbs);

  return (
    <Card className="w-full gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">
          {data.suburb}
          <span className="font-normal text-muted-foreground">
            , {data.region}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-4">
        {!data.hasLiveData && (
          <AlertMessage variant="info" className="py-2 text-xs">
            Indicative estimates — not enough live listings here yet.
          </AlertMessage>
        )}

        <div className="grid grid-cols-2 gap-2">
          {data.kpis.map((kpi) => (
            <div
              key={kpi.label}
              className={cn(
                "flex flex-col gap-0.5 rounded-lg bg-muted p-2.5",
                kpi.indicative &&
                  "border border-dashed border-border bg-transparent",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-muted-foreground">
                  {kpi.label}
                </span>
                {kpi.indicative && (
                  <span className="rounded-full bg-highlight/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-highlight">
                    Est.
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  {kpi.value}
                </span>
                {kpi.changePct != null && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[11px] font-medium",
                      kpi.changePct >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive",
                    )}
                  >
                    {kpi.changePct >= 0 ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {Math.abs(kpi.changePct)}%
                  </span>
                )}
              </div>

              {kpi.note && (
                <span className="text-[10px] text-muted-foreground">
                  {kpi.note}
                </span>
              )}
            </div>
          ))}
        </div>

        {nearby.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Nearby
            </span>
            <div className="flex flex-wrap gap-1.5">
              {nearby.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
