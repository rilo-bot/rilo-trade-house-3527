import { z } from "zod";

/**
 * Request schema for the page-insight endpoint that powers the on-screen guide
 * character. The client sends only what it knows from the assistant store —
 * the route resolves the rest server-side (it fetches the listing by id so the
 * spoken insight is grounded in real facts, never client-supplied claims).
 */
export const insightRequestSchema = z.object({
  /** The current route, e.g. "/properties/abc123" (for logging/templating). */
  path: z.string().max(512).optional(),
  /** A specific listing in focus — the route fetches its facts to ground the insight. */
  listingId: z.string().min(1).max(128).optional(),
  /** Suburb/region in focus when there's no single listing (search, insights). */
  suburb: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
});

export type InsightRequest = z.infer<typeof insightRequestSchema>;

/** The shape returned to the guide: a short spoken-style line + a follow-up. */
export type InsightResponse = {
  /** 1–3 sentences, plain prose, safe to read aloud (no markdown/URLs). */
  text: string;
  /** What kind of surface this insight describes (drives the guide's CTA). */
  kind: "auction" | "listing" | "page";
  /** A natural follow-up to seed the full chat if the user wants more. */
  followUp?: string;
};
