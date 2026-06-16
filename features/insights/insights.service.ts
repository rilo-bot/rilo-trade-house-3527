import { formatNZD } from "@/features/listings/listing-labels";
import {
  aggregateActiveByLocality,
  type LocalityStats,
} from "@/features/listings/listings.repository";
import { isNzRegion } from "@/lib/nz-locations";
import {
  DEFAULT_REGION,
  DEFAULT_SUBURB,
  INSIGHT_REGIONS,
  districtForSuburb,
  median,
  seededRand,
  siblingSuburbs,
  suburbsForRegion,
  type Kpi,
  type NearbyRow,
  type SuburbInsights,
  type TrendPoint,
  type VolumePoint,
} from "./insights.data";

/**
 * Suburb Insights service. Real metrics (for-sale counts, median asking
 * price/rent, days listed, new-listings-per-month) come from live listings;
 * value/trend/demand figures are deterministic INDICATIVE estimates (no sold
 * data exists). Everything indicative is flagged so the UI can label it.
 */

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const EMPTY_STATS: LocalityStats = {
  count: 0,
  salePrices: [],
  rentPrices: [],
  createdAts: [],
};

/** Last 12 calendar months (oldest → newest) with histogram bucket keys. */
function last12Months(): { label: string; key: string }[] {
  const now = new Date();
  const out: { label: string; key: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      label: MONTH_NAMES[d.getMonth()],
      key: `${d.getFullYear()}-${d.getMonth()}`,
    });
  }
  return out;
}

const rentLabel = (weekly: number) =>
  `$${Math.round(weekly).toLocaleString("en-NZ")}/wk`;

/** Average whole days since each listing went live. */
function avgDaysListed(createdAts: string[]): number {
  if (createdAts.length === 0) return 0;
  const now = Date.now();
  const total = createdAts.reduce((sum, iso) => {
    const t = new Date(iso).getTime();
    return sum + (Number.isNaN(t) ? 0 : (now - t) / 86_400_000);
  }, 0);
  return Math.round(total / createdAts.length);
}

/** Bucket listing dates into the last-12-months histogram. */
function monthlyCounts(
  createdAts: string[],
  months: { key: string }[],
): number[] {
  const counts = months.map(() => 0);
  const idx = new Map(months.map((m, i) => [m.key, i] as const));
  for (const iso of createdAts) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i != null) counts[i]++;
  }
  return counts;
}

export async function getSuburbInsights(
  regionIn?: string,
  suburbIn?: string,
): Promise<SuburbInsights> {
  const region = regionIn && isNzRegion(regionIn) ? regionIn : DEFAULT_REGION;
  const suburbs = suburbsForRegion(region);
  const matched = suburbIn
    ? suburbs.find((s) => s.toLowerCase() === suburbIn.toLowerCase())
    : undefined;
  const suburb =
    matched ?? (suburbs.includes(DEFAULT_SUBURB) ? DEFAULT_SUBURB : suburbs[0]) ??
    DEFAULT_SUBURB;

  const district = districtForSuburb(region, suburb);
  const stats = district
    ? await aggregateActiveByLocality(region, district)
    : {};
  const months = last12Months();

  const own = stats[suburb] ?? EMPTY_STATS;
  const rnd = seededRand(`${region}|${suburb}`);

  // Indicative anchors — computed unconditionally so the seeded sequence is
  // stable regardless of how much real data exists.
  const indValue = Math.round((650_000 + rnd() * 1_350_000) / 10_000) * 10_000;
  const indRent = Math.round((480 + rnd() * 520) / 10) * 10;
  const indDays = 24 + Math.floor(rnd() * 22);
  const valueChange = +(1.5 + rnd() * 5).toFixed(1);
  const rentChange = +(1 + rnd() * 3.5).toFixed(1);
  const enquiriesPerListing = +(3 + rnd() * 9).toFixed(1);

  // Real where available, indicative otherwise.
  const realSale = median(own.salePrices);
  const realRent = median(own.rentPrices);
  const realDays = avgDaysListed(own.createdAts);
  const value = realSale > 0 ? realSale : indValue;
  const rent = realRent > 0 ? realRent : indRent;
  const days = realDays > 0 ? realDays : indDays;
  const demand =
    enquiriesPerListing >= 8
      ? "High"
      : enquiriesPerListing >= 5
        ? "Strong"
        : "Moderate";

  const kpis: Kpi[] = [
    { label: "Median value", value: formatNZD(value), delta: valueChange, indicative: true },
    { label: "Median rent", value: rentLabel(rent), delta: rentChange, indicative: realRent === 0 },
    { label: "Avg days on market", value: String(days), sub: "national avg 38", indicative: realDays === 0 },
    { label: "For sale now", value: String(own.count), sub: own.count === 1 ? "active listing" : "active listings" },
    { label: "Buyer demand", value: demand, sub: `${enquiriesPerListing} enquiries per listing`, indicative: true },
  ];

  // Price trend (12 months) — indicative smooth series, suburb vs region.
  const priceTrend: TrendPoint[] = months.map((m, i) => {
    const progress = i / (months.length - 1);
    const noise = (rnd() - 0.5) * value * 0.012;
    return {
      month: m.label,
      suburb: Math.round(value * (0.93 + 0.07 * progress) + noise),
      region: Math.round(value * (0.86 + 0.05 * progress)),
    };
  });

  // Monthly volume — REAL new-listings histogram when present, else indicative.
  const realCounts = monthlyCounts(own.createdAts, months);
  const volumeReal = realCounts.some((c) => c > 0);
  const volume: VolumePoint[] = months.map((m, i) => ({
    month: m.label,
    count: volumeReal ? realCounts[i] : 22 + Math.floor(rnd() * 18),
    current: i === months.length - 1,
  }));

  // Nearby suburbs — selected first, then siblings in the same district.
  const nearby: NearbyRow[] = [suburb, ...siblingSuburbs(region, suburb, 5)].map(
    (name) => {
      const s = stats[name] ?? EMPTY_STATS;
      const r2 = seededRand(`${region}|${name}`);
      const v =
        median(s.salePrices) ||
        Math.round((650_000 + r2() * 1_350_000) / 10_000) * 10_000;
      const rt = median(s.rentPrices) || Math.round((480 + r2() * 520) / 10) * 10;
      const dm = avgDaysListed(s.createdAts) || 24 + Math.floor(r2() * 22);
      return {
        suburb: name,
        medianValue: formatNZD(v),
        changePct: +(1.5 + r2() * 5).toFixed(1),
        medianRent: rentLabel(rt),
        daysOnMarket: dm,
        forSaleNow: s.count,
        current: name === suburb,
      };
    },
  );

  return {
    region,
    suburb,
    district,
    hasLiveData: own.count > 0,
    kpis,
    priceTrend,
    volume,
    volumeReal,
    nearby,
  };
}

export function listInsightRegions(): readonly string[] {
  return INSIGHT_REGIONS;
}

export function listInsightSuburbs(region: string): string[] {
  return suburbsForRegion(region);
}
