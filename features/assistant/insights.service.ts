import { generateText } from "ai";
import { getChatModel, isAiConfigured } from "@/lib/ai";
import { getPublicListing } from "@/features/listings/listings.service";
import {
  auctionPhase,
  isAuctionListing,
  type AuctionPhase,
} from "@/features/auctions/auction-window";
import {
  CATEGORY_LABELS,
  PROPERTY_TYPE_LABELS,
  formatArea,
  formatSalePrice,
} from "@/features/listings/listing-labels";
import type { Listing } from "@/features/listings/listings.repository";
import type { CurrentUser } from "@/lib/auth/guards";
import type { InsightRequest, InsightResponse } from "./insights.schema";

/**
 * Server-side "what am I looking at?" narrator for the floating guide character.
 *
 * Unlike the full chat assistant (streaming, tool-using), this returns ONE short
 * spoken line for the page in focus — grounded in real facts the route resolves
 * itself (it fetches the listing by id, never trusting client-supplied claims).
 * When a listing is an auction it leans into timing + how auctions work; for a
 * normal listing it highlights what's special and one honest read on value.
 *
 * The character should never be mute: when AI isn't configured (or errors), a
 * deterministic template built from the same facts is returned instead.
 */

/**
 * The spoken line itself is short, but the configured model is a "thinking"
 * model (e.g. Gemini Flash) whose reasoning can't be disabled on this endpoint
 * and is billed against the output budget. Too tight a cap truncates mid-answer
 * (or leaks reasoning), so we leave generous headroom for reasoning + the reply
 * and ask for minimal reasoning effort to keep it fast and cheap.
 */
const MAX_OUTPUT_TOKENS = 900;

/** Shared voice + guardrails for both the property and auction personas. */
const SYSTEM_BASE = [
  "You are Ava, a warm, sharp New Zealand real-estate guide who narrates what the visitor is currently looking at on a property marketplace. You speak out loud, so write for the ear.",
  "",
  "Style:",
  "- First person, friendly and confident, like a great agent showing someone around — never pushy or salesy-fake.",
  "- 2–3 short sentences, ~45 words max. Plain spoken prose only: no markdown, lists, emoji, headings, or URLs.",
  "- New Zealand tone and spelling. Prices are NZD; rentals are per week.",
  "",
  "Substance:",
  "- Use ONLY the facts given. NEVER invent rooms, features, schools, distances, prices, or numbers. If something isn't provided, don't mention it.",
  "Return ONLY the spoken line — no preamble or sign-off.",
].join("\n");

/** Property-detail persona: highlight what's special + one honest read on value. */
const PROPERTY_ROLE = [
  "",
  "Your role here — PROPERTY GUIDE:",
  "- Lead with what's genuinely appealing about this home, then add one honest, useful read: a trade-off, who it suits, or what to check before committing.",
].join("\n");

/** Auction-detail persona: timing, how auctions work, due diligence, light urgency. */
const AUCTION_ROLE = [
  "",
  "Your role here — AUCTION GUIDE (this listing is going to auction):",
  "- Lead with the auction timing (upcoming / live now / recently ended) and what stands out about the place.",
  "- Make clear auction sales are UNCONDITIONAL — finance, building report and legal checks must be sorted BEFORE bidding.",
  "- Add light, honest urgency only when it's live or close; offer to walk them through bidding. Never invent a reserve, deposit figure, or result.",
].join("\n");

/** Pick the persona for the surface the visitor is on. */
function systemFor(isAuction: boolean): string {
  return SYSTEM_BASE + (isAuction ? AUCTION_ROLE : PROPERTY_ROLE);
}

/** Render the listing's known facts as tidy lines for the prompt. */
function listingFacts(listing: Listing, phase: AuctionPhase | null): string {
  const cfg = listing.config;
  const place = [listing.location.locality, listing.location.state]
    .filter(Boolean)
    .join(", ");
  const lines: Array<string | false | undefined | null> = [
    listing.title && `Title: ${listing.title}`,
    listing.propertyType &&
      `Property type: ${PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType}`,
    listing.category &&
      `Category: ${CATEGORY_LABELS[listing.category] ?? listing.category}`,
    place && `Location: ${place}`,
    `Headline: ${formatSalePrice(listing.price)}`,
    cfg?.bedrooms != null && `Bedrooms: ${cfg.bedrooms}`,
    cfg?.bathrooms != null && `Bathrooms: ${cfg.bathrooms}`,
    cfg?.carSpaces != null && `Car spaces: ${cfg.carSpaces}`,
    listing.area && `Floor area: ${formatArea(listing.area)}`,
    listing.landArea && `Land area: ${formatArea(listing.landArea)}`,
    cfg?.yearBuilt != null && `Year built: ${cfg.yearBuilt}`,
    !!listing.amenities?.length &&
      `Features: ${listing.amenities.slice(0, 8).join(", ")}`,
    phase &&
      `Auction status: ${
        phase === "live"
          ? "LIVE right now"
          : phase === "upcoming"
            ? "upcoming"
            : "recently ended"
      }`,
    listing.description &&
      `Owner's description: ${listing.description.slice(0, 600)}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Deterministic fallback line so the guide is never silent without AI. */
function templateForListing(
  listing: Listing,
  isAuction: boolean,
  phase: AuctionPhase | null,
): string {
  const cfg = listing.config;
  const beds = cfg?.bedrooms != null ? `${cfg.bedrooms}-bedroom ` : "";
  const type = (
    listing.propertyType
      ? (PROPERTY_TYPE_LABELS[listing.propertyType] ?? "home")
      : "home"
  ).toLowerCase();
  const where = listing.location.locality
    ? ` in ${listing.location.locality}`
    : "";
  const headline = formatSalePrice(listing.price);
  // "a 3-bedroom house" / "an apartment" — article matches the spoken phrase.
  const article = /^[aeiou]/i.test(beds || type) ? "an" : "a";

  if (isAuction) {
    const when =
      phase === "live"
        ? "It's live right now"
        : phase === "ended"
          ? "The auction has just wrapped up"
          : `It goes under the hammer ${headline.replace(/^Auction\s*/, "")}`;
    return `This is ${article} ${beds}${type}${where} heading to auction. ${when} — remember auction sales are unconditional, so line up your finance and due diligence before you bid. Want me to walk you through it?`;
  }
  return `Here's ${article} ${beds}${type}${where}, ${headline.toLowerCase().startsWith("price") || headline.toLowerCase().startsWith("enquiries") ? headline.toLowerCase() : `listed at ${headline}`}. Have a look through the photos and details — ask me if it's good value or what the area's like.`;
}

/** Page-level copy for routes that aren't a single listing. Client-cheap + AI-free. */
function pageInsight(path: string, suburb?: string): InsightResponse {
  const p = path || "/";
  if (p.startsWith("/auctions")) {
    return {
      kind: "page",
      text: "These are the auctions happening now and coming up. Each one shows the date and a live countdown — and remember, auction sales are unconditional, so do your homework first. New to bidding? I can explain how it works.",
      followUp: "How do property auctions work?",
    };
  }
  if (p.startsWith("/insights")) {
    return {
      kind: "page",
      text: suburb
        ? `These are the market numbers for ${suburb}. I can compare it with a neighbouring suburb or explain what any of these figures actually mean for you.`
        : "This is the market dashboard — prices, rents and listing counts across suburbs. I can compare two suburbs or explain what any number means.",
      followUp: "Compare two suburbs for me",
    };
  }
  if (p.startsWith("/dashboard") || p.startsWith("/leads")) {
    return {
      kind: "page",
      text: "This is your dashboard. Track how your listings are performing and review the enquiries buyers have sent. Want a quick summary of your recent activity?",
      followUp: "Summarise my recent enquiries",
    };
  }
  if (p.startsWith("/post-property")) {
    return {
      kind: "page",
      text: "Let's get your property listed. Work through the details, photos and price — sharp photos and an honest description win more enquiries. Stuck on pricing? I can help.",
      followUp: "What price should I list at?",
    };
  }
  if (
    p.startsWith("/properties") ||
    p.startsWith("/buy") ||
    p.startsWith("/rent") ||
    p.startsWith("/flatmates")
  ) {
    return {
      kind: "page",
      text: "Let's find you a place. Use the filters to narrow by price, bedrooms and location — or just tell me in plain English what you're after and I'll search for you.",
      followUp: "3-bedroom homes to rent in Auckland",
    };
  }
  return {
    kind: "page",
    text: "Welcome to Trade House — I'm Ava, your guide. I can search live listings, compare suburbs and explain the New Zealand market, anywhere on the site. What are you looking for?",
    followUp: "What can you help me with?",
  };
}

export async function generatePageInsight(
  input: InsightRequest,
  user: CurrentUser | null,
): Promise<InsightResponse> {
  // No specific listing → a page-aware greeting/tip (no model call needed).
  if (!input.listingId) {
    return pageInsight(input.path ?? "", input.suburb);
  }

  // A listing is in focus: ground the insight in real, server-fetched facts.
  let listing: Listing;
  try {
    listing = await getPublicListing(input.listingId, user ?? undefined);
  } catch {
    // Listing gone/inactive — fall back to a neutral page line.
    return pageInsight(input.path ?? "/properties", input.suburb);
  }

  const isAuction = isAuctionListing(listing.price);
  const phase =
    isAuction && listing.price.auctionDate
      ? auctionPhase(listing.price.auctionDate)
      : null;
  const kind: InsightResponse["kind"] = isAuction ? "auction" : "listing";
  const followUp = isAuction
    ? "Tell me about this auction — how should I approach bidding?"
    : "Is this property good value, and what's the area like?";

  // No AI configured → still speak, from a deterministic template.
  if (!isAiConfigured()) {
    return {
      kind,
      text: templateForListing(listing, isAuction, phase),
      followUp,
    };
  }

  try {
    const { text, finishReason } = await generateText({
      model: getChatModel(),
      system: systemFor(isAuction),
      prompt: [
        isAuction
          ? "Narrate this AUCTION listing the visitor is viewing:"
          : "Narrate this listing the visitor is viewing:",
        "",
        listingFacts(listing, phase),
      ].join("\n"),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // This is a short factual narration — keep reasoning to a minimum (it's
      // mandatory on this model and billed against the output budget) so the
      // answer completes within budget and stays fast.
      providerOptions: {
        openrouter: { reasoning: { effort: "minimal" } },
      },
    });
    const clean = text.trim();
    // Never surface a cut-off sentence: if the model ran out of room (or said
    // nothing usable), fall back to the always-complete template.
    if (!clean || finishReason === "length") {
      return { kind, text: templateForListing(listing, isAuction, phase), followUp };
    }
    return { kind, text: clean, followUp };
  } catch (err) {
    console.error("[insights] generation failed:", err);
    return { kind, text: templateForListing(listing, isAuction, phase), followUp };
  }
}
