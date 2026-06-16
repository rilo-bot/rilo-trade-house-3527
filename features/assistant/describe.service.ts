import { generateText } from "ai";
import { getChatModel } from "@/lib/ai";
import type { DescribeRequest } from "./describe.schema";

/**
 * AI listing-description writer. Turns the structured facts the owner already
 * entered into warm, accurate marketing prose. No HTTP here — the controller
 * owns the request/response. The output is a SUGGESTION the owner reviews and
 * edits before submitting (human-in-the-loop), never an autonomous write.
 */

/** Descriptions are short; cap output tightly to keep it fast + cheap. */
const MAX_OUTPUT_TOKENS = 500;

/** Render the known facts as a tidy bullet list for the prompt. */
function factLines(input: DescribeRequest): string {
  const place = [input.suburb, input.city, input.region]
    .filter(Boolean)
    .join(", ");
  const lines: Array<string | false | undefined> = [
    input.listingType && `Listing type: ${input.listingType}`,
    input.category && `Category: ${input.category}`,
    input.propertyType && `Property type: ${input.propertyType}`,
    input.title && `Working title: ${input.title}`,
    place && `Location: ${place}`,
    input.bedrooms != null && `Bedrooms: ${input.bedrooms}`,
    input.bathrooms != null && `Bathrooms: ${input.bathrooms}`,
    input.carSpaces != null && `Car spaces: ${input.carSpaces}`,
    input.floorArea && `Floor area: ${input.floorArea}`,
    input.landArea && `Land area: ${input.landArea}`,
    input.furnishing && `Furnishing: ${input.furnishing}`,
    input.yearBuilt != null && `Year built: ${input.yearBuilt}`,
    input.price && `Price: ${input.price}`,
    !!input.amenities?.length && `Features: ${input.amenities.join(", ")}`,
  ];
  return lines.filter(Boolean).join("\n");
}

const SYSTEM = [
  "You are a copywriter for a New Zealand property marketplace. You write clear, warm, professional listing descriptions that help a property sell or rent.",
  "",
  "Hard rules:",
  "- Use ONLY the facts provided. NEVER invent rooms, features, measurements, schools, distances, or claims that aren't given. If a detail isn't provided, simply don't mention it.",
  "- 80–160 words, in 1–3 short paragraphs. Plain prose only — no markdown, headings, bullet points, emoji, or ALL-CAPS.",
  "- New Zealand spelling and tone. Prices are NZD; rentals are per week. Don't restate the exact price unless it adds value.",
  "- Lead with what's most appealing, weave in the suburb/location, and close with a soft invitation to enquire or view.",
  "- Be honest and specific, not hyperbolic. No fair-housing-sensitive or discriminatory language.",
  "Return ONLY the description text — no preamble, quotes, or sign-off.",
].join("\n");

export async function generateListingDescription(
  input: DescribeRequest,
): Promise<string> {
  const facts = factLines(input);
  const prompt =
    input.mode === "improve" && input.currentDescription?.trim()
      ? [
          "Rewrite and polish the following property description so it reads better and is more compelling, while staying faithful to the facts. Don't add facts that aren't supported below.",
          "",
          "Current description:",
          `"""\n${input.currentDescription.trim()}\n"""`,
          "",
          "Known facts:",
          facts || "(none beyond the description above)",
        ].join("\n")
      : [
          "Write a property listing description from these facts:",
          "",
          facts || "(minimal details provided — keep it general but appealing, and don't invent specifics)",
        ].join("\n");

  const { text } = await generateText({
    model: getChatModel(),
    system: SYSTEM,
    prompt,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  });

  return text.trim();
}
