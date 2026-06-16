import { NZ_REGIONS, NZ_REGION_NAMES, NZ_SUBURBS } from "@/lib/nz-locations";

/**
 * Types + pure helpers for the Suburb Insights page.
 *
 * IMPORTANT — data honesty: the app has no sold/historical/council data, only
 * live listings + enquiries. So metrics derivable from listings (for-sale
 * counts, asking price/rent, days listed, new-listings-per-month) are REAL,
 * while value/sales/trend figures are clearly-labelled INDICATIVE estimates,
 * synthesised deterministically per suburb so they're stable across renders
 * (no `Math.random`, no hydration drift). See `insights.service.ts`.
 */

export const DEFAULT_REGION = "Auckland";
export const DEFAULT_SUBURB = "Mount Albert";

export type TrendPoint = { month: string; suburb: number; region: number };
export type VolumePoint = { month: string; count: number; current?: boolean };

export type Kpi = {
  label: string;
  value: string;
  /** Small context line under the value, e.g. "national avg 38". */
  sub?: string;
  /** Optional % delta — rendered with an up/down arrow + colour. */
  delta?: number;
  /** Marks figures we can't truly back yet (sold value, sales, demand). */
  indicative?: boolean;
};

export type NearbyRow = {
  suburb: string;
  medianValue: string;
  changePct: number;
  medianRent: string;
  daysOnMarket: number;
  forSaleNow: number;
  current?: boolean;
};

export type SuburbInsights = {
  region: string;
  suburb: string;
  district: string | null;
  /** True when the suburb has live listings backing some metrics. */
  hasLiveData: boolean;
  kpis: Kpi[];
  priceTrend: TrendPoint[];
  /** Monthly bars — real (new listings) when `volumeReal`, else indicative. */
  volume: VolumePoint[];
  volumeReal: boolean;
  nearby: NearbyRow[];
};

/** Deterministic 0..1 generator seeded from a string (mulberry32 over a hash). */
export function seededRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Median of a numeric list (0 when empty). */
export function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** All suburbs in a region (across its districts), de-duped + sorted. */
export function suburbsForRegion(region: string): string[] {
  const r = NZ_REGIONS.find(
    (x) => x.name.toLowerCase() === region.toLowerCase(),
  );
  if (!r) return [];
  const set = new Set<string>();
  for (const d of r.districts) for (const s of NZ_SUBURBS[d] ?? []) set.add(s);
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** The district that contains a suburb within a region. */
export function districtForSuburb(
  region: string,
  suburb: string,
): string | null {
  const r = NZ_REGIONS.find(
    (x) => x.name.toLowerCase() === region.toLowerCase(),
  );
  if (!r) return null;
  for (const d of r.districts) {
    if (
      (NZ_SUBURBS[d] ?? []).some((s) => s.toLowerCase() === suburb.toLowerCase())
    ) {
      return d;
    }
  }
  return null;
}

/** Sibling suburbs in the same district (excluding the given one). */
export function siblingSuburbs(
  region: string,
  suburb: string,
  limit = 5,
): string[] {
  const d = districtForSuburb(region, suburb);
  if (!d) return [];
  return (NZ_SUBURBS[d] ?? [])
    .filter((s) => s.toLowerCase() !== suburb.toLowerCase())
    .slice(0, limit);
}

export const INSIGHT_REGIONS = NZ_REGION_NAMES;
