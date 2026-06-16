/**
 * Shared, framework-pure filter core for the listings search.
 *
 * `FilterValues` is the single contract describing every searchable filter; the
 * param names produced by `buildListingParams` match `listingQuerySchema` exactly
 * so the same object drives both the homepage advanced panel (which navigates to
 * the results page) and the `/properties` results filters (which fetch in place).
 *
 * Pure — no React, no "use client" — so server components (the search view) can
 * import the type and constants too.
 */

// Sentinel for Radix "Any/All" Select options (empty string isn't allowed).
export const ANY = "any";

// Preset price steps (NZD) for the min/max dropdowns.
export const PRICE_STEPS = [
  300_000, 400_000, 500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000,
  1_250_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000,
];

// Preset rateable/capital value (CV) steps (NZD) for the min/max dropdowns.
export const CV_STEPS = [
  300_000, 500_000, 750_000, 1_000_000, 1_250_000, 1_500_000, 2_000_000,
  3_000_000, 5_000_000,
];

export const BED_BATH = [1, 2, 3, 4, 5];
export const PARKING = [1, 2, 3, 4];

/** Auction-date quick presets (NZ buyers think "what's on this weekend?"). */
export const AUCTION_PRESETS = [
  { value: "this_weekend", label: "This weekend" },
  { value: "next_7_days", label: "Next 7 days" },
  { value: "next_30_days", label: "Next 30 days" },
  { value: "upcoming", label: "All upcoming" },
] as const;

/** Local "YYYY-MM-DDTHH:mm" (no offset) — the same shape as a stored
 *  `price.auctionDate`, so a plain string comparison in the query is correct. */
function toLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * Concrete auction-date window for a preset, as local ISO strings. Computed in
 * the browser so "this weekend" uses the visitor's local (NZ) wall-clock, which
 * matches how auction dates are stored. An unknown/"any" preset clears it.
 *
 * The window is captured at pick time, so a stale bookmarked link can point at a
 * past window — re-selecting the preset refreshes it.
 */
export function auctionWindow(preset?: string): {
  minAuctionDate?: string;
  maxAuctionDate?: string;
} {
  const now = new Date();
  switch (preset) {
    case "this_weekend": {
      const sat = new Date(now);
      const day = now.getDay(); // 0 Sun … 6 Sat
      // Sunday belongs to the current weekend → step back to Saturday; otherwise
      // jump to the coming Saturday (0 days if today already is Saturday).
      sat.setDate(now.getDate() + (day === 0 ? -1 : (6 - day) % 7));
      sat.setHours(0, 0, 0, 0);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      sun.setHours(23, 59, 0, 0);
      return { minAuctionDate: toLocalIso(sat), maxAuctionDate: toLocalIso(sun) };
    }
    case "next_7_days":
    case "next_30_days": {
      const end = new Date(now);
      end.setDate(now.getDate() + (preset === "next_7_days" ? 7 : 30));
      end.setHours(23, 59, 0, 0);
      return { minAuctionDate: toLocalIso(now), maxAuctionDate: toLocalIso(end) };
    }
    case "upcoming":
      // No upper bound — everything from now on. Return maxAuctionDate
      // explicitly so spreading this window clears any stale ceiling left by a
      // previously-selected bounded preset (this weekend / next 7 / next 30).
      return { minAuctionDate: toLocalIso(now), maxAuctionDate: undefined };
    default:
      return {};
  }
}

/**
 * Curated, NZ-common property features for the amenities filter chips. These are
 * matched leniently (case-insensitive substring) against each listing's free-text
 * `amenities`, so they need only be sensible search terms, not an exact taxonomy.
 */
export const COMMON_AMENITIES = [
  "Heat pump",
  "Garage",
  "Off-street parking",
  "Ensuite",
  "Study",
  "Pool",
  "Deck",
  "Garden",
  "Dishwasher",
  "Insulation",
  "Fireplace",
  "Air conditioning",
  "Solar",
  "Sea view",
];

/** The full set of search filters. All optional; only set fields are applied. */
export interface FilterValues {
  listingType?: string;
  region?: string;
  district?: string;
  /** Multi-select suburbs (location.locality). */
  localities?: string[];
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  minCv?: number;
  maxCv?: number;
  bedrooms?: number;
  bathrooms?: number;
  minParking?: number;
  /** Single property type (legacy) — superseded by `propertyTypes` when set. */
  propertyType?: string;
  propertyTypes?: string[];
  category?: string;
  saleType?: string;
  titleTypes?: string[];
  priceMethods?: string[];
  /** Auction-date window (local ISO strings); drives the actual query. */
  minAuctionDate?: string;
  maxAuctionDate?: string;
  /** Which preset produced the window above — UI memory for the Select. */
  auctionPreset?: string;
  furnishing?: string;
  pgGender?: string;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  minLandAreaSqm?: number;
  maxLandAreaSqm?: number;
  minFloorAreaSqm?: number;
  maxFloorAreaSqm?: number;
  amenities?: string[];
  openHomes?: boolean;
  sort?: string;
}

const setNum = (p: URLSearchParams, key: string, v?: number) => {
  if (v !== undefined && v !== null && !Number.isNaN(v) && v !== 0) {
    p.set(key, String(v));
  }
};
const setCsv = (p: URLSearchParams, key: string, v?: string[]) => {
  if (v && v.length) p.set(key, v.join(","));
};

/**
 * Build the URL query params for a set of filter values. Param names match
 * `listingQuerySchema`; empty/zero values are omitted so the URL stays clean.
 */
export function buildListingParams(v: FilterValues): URLSearchParams {
  const p = new URLSearchParams();
  if (v.listingType) p.set("listingType", v.listingType);
  if (v.region) p.set("region", v.region);
  if (v.district) p.set("district", v.district);
  setCsv(p, "localities", v.localities);
  if (v.q) p.set("q", v.q);
  setNum(p, "minPrice", v.minPrice);
  setNum(p, "maxPrice", v.maxPrice);
  setNum(p, "minCv", v.minCv);
  setNum(p, "maxCv", v.maxCv);
  setNum(p, "bedrooms", v.bedrooms);
  setNum(p, "bathrooms", v.bathrooms);
  setNum(p, "minParking", v.minParking);
  // Multi property type wins over the single value.
  if (v.propertyTypes && v.propertyTypes.length) {
    p.set("propertyTypes", v.propertyTypes.join(","));
  } else if (v.propertyType) {
    p.set("propertyType", v.propertyType);
  }
  if (v.category) p.set("category", v.category);
  if (v.saleType) p.set("saleType", v.saleType);
  setCsv(p, "titleTypes", v.titleTypes);
  setCsv(p, "priceMethods", v.priceMethods);
  // Concrete dates drive the query; the preset key round-trips the Select.
  if (v.minAuctionDate) p.set("minAuctionDate", v.minAuctionDate);
  if (v.maxAuctionDate) p.set("maxAuctionDate", v.maxAuctionDate);
  if (v.auctionPreset) p.set("auctionWindow", v.auctionPreset);
  if (v.furnishing) p.set("furnishing", v.furnishing);
  if (v.pgGender) p.set("pgGender", v.pgGender);
  setNum(p, "minYearBuilt", v.minYearBuilt);
  setNum(p, "maxYearBuilt", v.maxYearBuilt);
  setNum(p, "minLandAreaSqm", v.minLandAreaSqm);
  setNum(p, "maxLandAreaSqm", v.maxLandAreaSqm);
  setNum(p, "minFloorAreaSqm", v.minFloorAreaSqm);
  setNum(p, "maxFloorAreaSqm", v.maxFloorAreaSqm);
  setCsv(p, "amenities", v.amenities);
  if (v.openHomes) p.set("openHomes", "true");
  if (v.sort && v.sort !== "newest") p.set("sort", v.sort);
  return p;
}

/**
 * Count the "refinement" filters that are active (everything except the
 * listing-type tab + sort). Powers a "Filters (N)" badge on the advanced toggle.
 */
export function countActiveFilters(v: FilterValues): number {
  let n = 0;
  if (v.region) n++;
  if (v.district) n++;
  if (v.localities?.length) n++;
  if (v.q) n++;
  if (v.minPrice || v.maxPrice) n++;
  if (v.minCv || v.maxCv) n++;
  if (v.bedrooms) n++;
  if (v.bathrooms) n++;
  if (v.minParking) n++;
  if (v.propertyTypes?.length || v.propertyType) n++;
  if (v.category) n++;
  if (v.saleType) n++;
  if (v.titleTypes?.length) n++;
  if (v.priceMethods?.length) n++;
  if (v.minAuctionDate || v.maxAuctionDate) n++;
  if (v.furnishing) n++;
  if (v.pgGender) n++;
  if (v.minYearBuilt || v.maxYearBuilt) n++;
  if (v.minLandAreaSqm || v.maxLandAreaSqm) n++;
  if (v.minFloorAreaSqm || v.maxFloorAreaSqm) n++;
  if (v.amenities?.length) n++;
  if (v.openHomes) n++;
  return n;
}
