import { generateObject } from "ai";
import { getChatModel } from "@/lib/ai";
import { SaleMethod } from "@/lib/enums";
import { resolvePlace } from "@/lib/nz-locations";
import { BadRequestError } from "@/lib/errors";
import type { FilterValues } from "./listing-filters";
import {
  aiSearchExtractionSchema,
  type AiSearchExtraction,
} from "./ai-search.schema";

/**
 * AI advanced search business logic. Turns a free-text sentence into the same
 * `FilterValues` the homepage search and `/properties` filters already speak,
 * so the rest of the pipeline (URL params → query schema → repository) is
 * unchanged. No HTTP here — the controller owns request/response.
 *
 * The model only ever EXTRACTS structured intent (`generateObject` with a strict
 * schema); it never sees the database. Location is resolved deterministically
 * server-side via `resolvePlace`, so a hallucinated suburb degrades to a plain
 * keyword rather than a bogus region filter.
 */

const MAX_OUTPUT_TOKENS = 500;

function systemPrompt(today: string): string {
  return [
    "You convert a New Zealand property-search sentence into structured search filters.",
    `Today's date is ${today} (NZ). Use it for any relative time like 'this weekend' or 'new build'.`,
    "",
    "Rules:",
    "- Extract ONLY what the user actually expressed. Leave every other field unset — do not guess defaults.",
    "- Prices and capital values are NZD. '$1.2m'/'1.2 million' → 1200000; '850k' → 850000.",
    "- 'a garage' → minParking 1; 'double garage'/'two car' → minParking 2.",
    "- Map locations to the single most specific NZ place named (suburb > district/city > region). Never invent a place that wasn't mentioned.",
    "- Rentals are quoted per week in NZ; treat a rent budget as the weekly figure.",
    "- Always fill `summary` with a short, friendly recap of the search you understood.",
  ].join("\n");
}

/** Resolve the extracted free-text place into region/district/locality (or keyword). */
function applyPlace(filters: FilterValues, place?: string): void {
  const name = place?.trim();
  if (!name) return;
  const resolved = resolvePlace(name);
  if (resolved.region) {
    filters.region = resolved.region;
    filters.district = resolved.district;
    // A resolved suburb becomes an exact-match locality; otherwise the
    // region/district filters already pin the area.
    if (resolved.suburb) filters.localities = [resolved.suburb];
  } else {
    // Unrecognised place → treat as a free-text keyword, same as the home search.
    filters.q = name;
  }
}

/** Map the model's extraction onto the shared `FilterValues` contract. */
function toFilterValues(
  extraction: AiSearchExtraction,
  fallbackListingType?: string,
): FilterValues {
  const filters: FilterValues = {
    listingType: extraction.listingType ?? fallbackListingType,
    minPrice: extraction.minPrice,
    maxPrice: extraction.maxPrice,
    minCv: extraction.minCv,
    maxCv: extraction.maxCv,
    bedrooms: extraction.minBedrooms,
    bathrooms: extraction.minBathrooms,
    minParking: extraction.minParking,
    propertyTypes: extraction.propertyTypes,
    saleType: extraction.saleType,
    priceMethods: extraction.priceMethods,
    auctionPreset: extraction.auctionPreset,
    furnishing: extraction.furnishing,
    pgGender: extraction.pgGender,
    minYearBuilt: extraction.minYearBuilt,
    maxYearBuilt: extraction.maxYearBuilt,
    minLandAreaSqm: extraction.minLandAreaSqm,
    maxLandAreaSqm: extraction.maxLandAreaSqm,
    minFloorAreaSqm: extraction.minFloorAreaSqm,
    maxFloorAreaSqm: extraction.maxFloorAreaSqm,
    amenities: extraction.amenities?.length ? extraction.amenities : undefined,
    openHomes: extraction.openHomes || undefined,
    sort: extraction.sort,
  };

  applyPlace(filters, extraction.place);

  // An auction-date window implies auction listings — make sure the sale-method
  // filter agrees so the result set isn't widened by non-auction listings.
  if (filters.auctionPreset) {
    const methods = new Set(filters.priceMethods ?? []);
    methods.add(SaleMethod.Auction);
    filters.priceMethods = [...methods];
  }

  return filters;
}

export interface AiSearchResult {
  filters: FilterValues;
  summary: string;
}

/**
 * Parse a natural-language query into filters + a human-readable summary. The
 * concrete auction-date window for `auctionPreset` is intentionally NOT computed
 * here — the client applies `auctionWindow(preset)` so the window uses the
 * visitor's local (NZ) wall-clock, matching how auction dates are stored.
 */
export async function parseSearchQuery(
  query: string,
  fallbackListingType?: string,
): Promise<AiSearchResult> {
  const today = new Date().toISOString().slice(0, 10);

  let extraction: AiSearchExtraction;
  try {
    const result = await generateObject({
      model: getChatModel(),
      schema: aiSearchExtractionSchema,
      system: systemPrompt(today),
      prompt: query,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
    extraction = result.object;
  } catch (err) {
    // A schema-mismatch / model error shouldn't 500 — it's a "couldn't parse"
    // case the UI should surface gently so the user can rephrase.
    console.error("[ai-search] extraction failed:", err);
    throw new BadRequestError(
      "Sorry — I couldn't turn that into a search. Try rephrasing, e.g. “3-bed house in Ponsonby under $1.2M”.",
    );
  }

  return {
    filters: toFilterValues(extraction, fallbackListingType),
    summary: extraction.summary,
  };
}
