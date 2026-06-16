import { z } from "zod";
import {
  Furnishing,
  ListingType,
  PgGender,
  PropertyType,
  SaleMethod,
  SaleType,
} from "@/lib/enums";

/**
 * Schemas for the AI advanced search — natural-language → structured filters.
 *
 * `aiSearchRequestSchema` guards the HTTP boundary (the sentence the visitor
 * typed, plus the tab they're on as a listing-type fallback).
 *
 * `aiSearchExtractionSchema` is the SHAPE THE MODEL FILLS via `generateObject`.
 * It mirrors the searchable `FilterValues` but deliberately stays loose on
 * location: the model emits a free-text `place` name which the service resolves
 * with the SAME `resolvePlace` the homepage already uses — so we never have to
 * stuff the full NZ suburb gazetteer into the prompt.
 */

/** Hard cap on the query length — a cost guard on prompt tokens. */
export const MAX_QUERY_CHARS = 300;

export const aiSearchRequestSchema = z.object({
  query: z.string().trim().min(1, "Tell me what you're looking for").max(MAX_QUERY_CHARS),
  // The tab the user is on (Buy/Rent/Flatmates) — used only when the sentence
  // itself doesn't make the intent explicit.
  listingType: z.enum(ListingType).optional(),
});

export type AiSearchRequest = z.infer<typeof aiSearchRequestSchema>;

/** Sort keys the model may choose — must match `listingQuerySchema.sort`. */
export const SORT_KEYS = [
  "newest",
  "price_asc",
  "price_desc",
  "cv_asc",
  "cv_desc",
  "land_asc",
  "land_desc",
  "floor_asc",
  "floor_desc",
  "auction_soonest",
] as const;

/** Auction-date presets the model may choose — must match `auctionWindow`. */
export const AUCTION_PRESET_KEYS = [
  "this_weekend",
  "next_7_days",
  "next_30_days",
  "upcoming",
] as const;

/**
 * Coerce a model-emitted numeric value that arrived as a string back into a
 * number. Models frequently return large/monetary values as strings with
 * currency symbols, thousands separators, or word suffixes ("$1,200,000",
 * "1.2m", "1 million", "850k") even when the schema asks for a number. Without
 * this, `z.number()` rejects the value and `generateObject` throws, so a single
 * price in the sentence would wipe out the ENTIRE extraction (and every other
 * filter). We still advertise `type: number` to the model — this only rescues
 * the cases where it ignores that.
 */
function parseLooseNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const cleaned = value.trim().toLowerCase().replace(/nzd?|\$|,|\s/g, "");
  if (!cleaned) return value;
  const match = cleaned.match(/^(-?[\d.]+)(k|thousand|m|mil|million|bn|billion)?$/);
  if (!match) return value;
  const n = parseFloat(match[1]);
  if (Number.isNaN(n)) return value;
  switch (match[2]) {
    case "k":
    case "thousand":
      return n * 1_000;
    case "m":
    case "mil":
    case "million":
      return n * 1_000_000;
    case "bn":
    case "billion":
      return n * 1_000_000_000;
    default:
      return n;
  }
}

/** A numeric extraction field that tolerates string output from the model. */
const looseNumber = (schema: z.ZodType<number>) =>
  z.preprocess(parseLooseNumber, schema);

/**
 * What the model extracts from the sentence. Every field optional — the model
 * sets only what the user actually expressed; everything else stays unfiltered.
 */
export const aiSearchExtractionSchema = z.object({
  listingType: z
    .enum(ListingType)
    .optional()
    .describe(
      "Intent: 'sale' to buy, 'rent' to rent, 'pg' for flatmates/boarding/co-living. Only set if the sentence makes it explicit.",
    ),
  place: z
    .string()
    .optional()
    .describe(
      "A single NZ location named in the query — a suburb, district/city, or region (e.g. 'Ponsonby', 'Christchurch', 'Wellington'). Omit if no place is mentioned. Do NOT invent one.",
    ),
  minPrice: looseNumber(z.number().nonnegative()).optional().describe("Lower price bound in NZD."),
  maxPrice: looseNumber(z.number().nonnegative()).optional().describe("Upper price/budget in NZD. 'under $1.2M' → 1200000."),
  minCv: looseNumber(z.number().nonnegative()).optional().describe("Lower rateable/capital value (CV) bound, NZD."),
  maxCv: looseNumber(z.number().nonnegative()).optional().describe("Upper rateable/capital value (CV) bound, NZD."),
  minBedrooms: looseNumber(z.number().int().min(0)).optional().describe("Minimum bedrooms. '3 bed' or '3+ beds' → 3."),
  minBathrooms: looseNumber(z.number().int().min(0)).optional().describe("Minimum bathrooms."),
  minParking: looseNumber(z.number().int().min(0))
    .optional()
    .describe("Minimum car parks/garage spaces. 'a garage' → 1, 'double garage' → 2."),
  propertyTypes: z
    .array(z.enum(PropertyType))
    .optional()
    .describe("Concrete property types mentioned (house, apartment, townhouse, unit, villa, studio, section, lifestyle…)."),
  saleType: z.enum(SaleType).optional().describe("ready, under_construction, or resale — only if stated."),
  priceMethods: z
    .array(z.enum(SaleMethod))
    .optional()
    .describe("Sale method, e.g. ['auction'] for 'auctions' or 'going to auction'; ['tender'], ['deadline_sale'] likewise."),
  auctionPreset: z
    .enum(AUCTION_PRESET_KEYS)
    .optional()
    .describe("Auction-date window: 'this weekend' → this_weekend; 'next week' → next_7_days; 'this month' → next_30_days; 'upcoming auctions' → upcoming."),
  furnishing: z.enum(Furnishing).optional().describe("unfurnished, semi_furnished, or furnished — only if stated."),
  pgGender: z.enum(PgGender).optional().describe("Flatmate gender policy: boys, girls, or coliving — only for flatmate/PG searches."),
  minYearBuilt: looseNumber(z.number().int().min(1800).max(2100)).optional().describe("Earliest build year. 'built after 2010' → 2010; 'new build' → recent year."),
  maxYearBuilt: looseNumber(z.number().int().min(1800).max(2100)).optional().describe("Latest build year."),
  minLandAreaSqm: looseNumber(z.number().nonnegative()).optional().describe("Minimum land/section area in square metres."),
  maxLandAreaSqm: looseNumber(z.number().nonnegative()).optional().describe("Maximum land/section area in square metres."),
  minFloorAreaSqm: looseNumber(z.number().nonnegative()).optional().describe("Minimum floor area in square metres."),
  maxFloorAreaSqm: looseNumber(z.number().nonnegative()).optional().describe("Maximum floor area in square metres."),
  amenities: z
    .array(z.string().max(40))
    .optional()
    .describe("Desired features as short keywords (e.g. 'Heat pump', 'Pool', 'Sea view', 'Ensuite', 'Study')."),
  openHomes: z.boolean().optional().describe("true only if the user wants properties with a scheduled open home."),
  sort: z
    .enum(SORT_KEYS)
    .optional()
    .describe("Ordering: 'cheapest' → price_asc; 'most expensive' → price_desc; 'newest listings' → newest; 'auctions soonest' → auction_soonest."),
  summary: z
    .string()
    .max(160)
    .describe("A short, friendly one-line summary of the search you understood (e.g. '3-bed houses in Ponsonby under $1.2M with parking')."),
});

export type AiSearchExtraction = z.infer<typeof aiSearchExtractionSchema>;
