import { z } from "zod";

/**
 * Input for the AI listing-description writer (POST /api/assistant/describe).
 * The wizard sends the structured facts it already collected; the model turns
 * them into prose. All fields bounded; the model is told to use ONLY these
 * facts (no invention). Formatted strings (price/area) come pre-rendered from
 * the client so we don't duplicate the listing-label formatting server-side.
 */

/** Upper bound on the description we accept for "improve" mode. */
export const MAX_DESCRIPTION_INPUT = 4000;

export const describeRequestSchema = z.object({
  /** "generate" writes from scratch; "improve" rewrites the current text. */
  mode: z.enum(["generate", "improve"]).default("generate"),
  listingType: z.string().max(40).optional(),
  category: z.string().max(40).optional(),
  propertyType: z.string().max(40).optional(),
  title: z.string().max(200).optional(),
  suburb: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  carSpaces: z.number().int().min(0).max(50).optional(),
  floorArea: z.string().max(40).optional(),
  landArea: z.string().max(40).optional(),
  furnishing: z.string().max(60).optional(),
  yearBuilt: z.number().int().min(1800).max(2100).optional(),
  price: z.string().max(60).optional(),
  amenities: z.array(z.string().max(60)).max(40).optional(),
  currentDescription: z.string().max(MAX_DESCRIPTION_INPUT).optional(),
});

export type DescribeRequest = z.infer<typeof describeRequestSchema>;

/** What the client sends (mode is derived from whether a draft exists). */
export type DescribeFields = Omit<DescribeRequest, "mode">;
