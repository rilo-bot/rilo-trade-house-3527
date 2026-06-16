import { z } from "zod";
import { listingQuerySchema } from "@/features/listings/listings.schema";

/**
 * Saved searches — a seeker stores a set of search filters and (optionally) gets
 * emailed when new matching listings appear.
 *
 * The stored query is the FILTER subset of the public search: `page`/`limit`/
 * `sort` are dropped because they only affect how results are displayed, not
 * what matches. Reusing `listingQuerySchema.pick(...)` keeps the saved-search
 * filters in lock-step with the real search (and inherits its string coercion +
 * `.catch()` degradation), so a saved query always re-runs identically.
 */
export const savedSearchFiltersSchema = listingQuerySchema.pick({
  listingType: true,
  category: true,
  saleType: true,
  propertyType: true,
  propertyTypes: true,
  region: true,
  district: true,
  city: true,
  cities: true,
  locality: true,
  localities: true,
  titleTypes: true,
  priceMethods: true,
  minPrice: true,
  maxPrice: true,
  minCv: true,
  maxCv: true,
  bedrooms: true,
  bathrooms: true,
  minParking: true,
  minYearBuilt: true,
  maxYearBuilt: true,
  minLandAreaSqm: true,
  maxLandAreaSqm: true,
  minFloorAreaSqm: true,
  maxFloorAreaSqm: true,
  amenities: true,
  furnishing: true,
  pgGender: true,
  openHomes: true,
  q: true,
});

export type SavedSearchFilters = z.infer<typeof savedSearchFiltersSchema>;

export const createSavedSearchSchema = z.object({
  name: z.string().trim().min(1).max(80),
  // Raw query params as produced by `URLSearchParams` on the search page; the
  // service normalises them through `savedSearchFiltersSchema`.
  query: z.record(z.string(), z.string()).default({}),
  alertsEnabled: z.boolean().default(true),
});

export const updateSavedSearchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  alertsEnabled: z.boolean().optional(),
});

export type CreateSavedSearchInput = z.infer<typeof createSavedSearchSchema>;
export type UpdateSavedSearchInput = z.infer<typeof updateSavedSearchSchema>;
