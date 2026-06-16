import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { ListingStatus, ListingType, UserRole } from "@/lib/enums";
import type { CurrentUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth-permissions";
import {
  listingQuerySchema,
  myListingsQuerySchema,
  type ListingQuery,
} from "@/features/listings/listings.schema";
import {
  STATUS_LABELS,
  formatSalePrice,
} from "@/features/listings/listing-labels";
import {
  searchListings,
  type Listing,
} from "@/features/listings/listings.repository";
import {
  activeListingLimitFor,
  countMyActiveListings,
  getPublicListing,
  listSearchCities,
  searchMyListings,
  searchPublicListings,
} from "@/features/listings/listings.service";
import {
  getSuburbInsights,
  listInsightRegions,
  listInsightSuburbs,
} from "@/features/insights/insights.service";
import { listFavoriteListings } from "@/features/favorites/favorites.service";
import { listOwnerLeads, listSeekerLeads } from "@/features/leads/leads.service";
import {
  LEAD_STATUS_LABELS,
  SEEKER_LEAD_STATUS_LABELS,
} from "@/features/leads/lead-labels";
import { listSavedSearches } from "@/features/saved-searches/saved-searches.service";

/** Human labels for the user's own role (account tool). */
const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Seeker]: "Home seeker",
  [UserRole.Owner]: "Property owner",
  [UserRole.Agent]: "Agent / broker",
  [UserRole.Admin]: "Administrator",
};

/**
 * The assistant's tools — each is a thin, Zod-typed wrapper over an existing
 * feature service, so it inherits that service's validation, auth, and
 * ownership rules. Read-only in v1.
 *
 * Security: tools are built per-request and the signed-in `user` is bound here
 * from the session. Tools NEVER take a user id from the model — personal data
 * is always scoped to the authenticated session, so the model can't reach
 * another user's data by guessing ids.
 */

/** Max listings handed to the model per search (keeps token cost bounded). */
const MAX_RESULTS = 6;

/** Compact, public-safe projection of a listing (notably: no `ownerId`). */
function toCard(l: Listing) {
  return {
    id: l.id,
    title: l.title,
    listingType: l.listingType,
    propertyType: l.propertyType,
    price: formatSalePrice(l.price),
    bedrooms: l.config?.bedrooms ?? null,
    bathrooms: l.config?.bathrooms ?? null,
    carSpaces: l.config?.carSpaces ?? null,
    suburb: l.location.locality,
    city: l.location.city,
    region: l.location.state,
    url: `/properties/${l.id}`,
    isFavorite: l.isFavorite ?? false,
    // Cover image (raw stored URL) so the chat widget can render a thumbnail;
    // the client's OptimizedImage normalizes the S3/proxy path itself.
    coverImage: l.media?.images?.[0] ?? null,
  };
}

/** Owner-facing card — adds status (so the owner sees draft/active/sold). */
function toOwnerCard(l: Listing) {
  return {
    ...toCard(l),
    status: l.status,
    statusLabel: STATUS_LABELS[l.status] ?? l.status,
    isVerified: l.isVerified,
    isFeatured: l.isFeatured,
  };
}

export function buildAssistantTools(user: CurrentUser | null): ToolSet {
  const tools: ToolSet = {
    searchListings: tool({
      description:
        "Search ACTIVE property listings on Trade House. Use whenever the user wants to find or browse properties to buy, rent, or flat-share (PG). Returns up to 6 matches. Only report listings this returns — never invent them.",
      inputSchema: z.object({
        query: z
          .string()
          .max(120)
          .optional()
          .describe("Free-text keywords, e.g. 'modern apartment with parking'"),
        listingType: z
          .enum(ListingType)
          .optional()
          .describe("sale (to buy), rent, or pg (flatmates/boarding)"),
        region: z
          .string()
          .max(80)
          .optional()
          .describe("NZ region, e.g. 'Auckland', 'Canterbury'"),
        city: z
          .string()
          .max(80)
          .optional()
          .describe("District/city, e.g. 'Papakura'"),
        locality: z
          .string()
          .max(120)
          .optional()
          .describe("Suburb, e.g. 'Ponsonby'"),
        minPrice: z.number().nonnegative().optional(),
        maxPrice: z.number().nonnegative().optional(),
        minBedrooms: z.number().int().min(0).optional(),
        minBathrooms: z.number().int().min(0).optional(),
        sort: z.enum(["newest", "price_asc", "price_desc"]).optional(),
      }),
      execute: async (input) => {
        const query = listingQuerySchema.parse({
          q: input.query,
          listingType: input.listingType,
          region: input.region,
          city: input.city,
          locality: input.locality,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          bedrooms: input.minBedrooms,
          bathrooms: input.minBathrooms,
          sort: input.sort ?? "newest",
          page: 1,
          limit: MAX_RESULTS,
        });
        const result = await searchPublicListings(query, user ?? undefined);
        return {
          totalMatches: result.total,
          shown: Math.min(result.items.length, MAX_RESULTS),
          listings: result.items.slice(0, MAX_RESULTS).map(toCard),
        };
      },
    }),

    getListingDetails: tool({
      description:
        "Get full details for ONE active listing by id (ids come from searchListings results). Use when the user asks about a specific property.",
      inputSchema: z.object({
        id: z.string().describe("The listing id from a searchListings result"),
      }),
      execute: async ({ id }) => {
        try {
          const l = await getPublicListing(id, user ?? undefined);
          return {
            ...toCard(l),
            description: l.description,
            amenities: l.amenities ?? [],
            address: l.location.address,
            postcode: l.location.pincode,
            contactPhone: l.contactPhone ?? null,
            openHomes: (l.openHomes ?? []).map((o) => ({
              start: o.start,
              end: o.end,
            })),
            yearBuilt: l.config?.yearBuilt ?? null,
            furnishing: l.config?.furnishing ?? null,
          };
        } catch {
          return { error: "Listing not found or no longer active." };
        }
      },
    }),

    getMarketInsights: tool({
      description:
        "Get NZ suburb market insights. For-sale count, asking rent, and days-on-market are REAL (from live listings); median value, 12-month trend, and buyer demand are INDICATIVE estimates (no sold-price data exists) — always label those as estimates. Use for 'what's the market like in X'.",
      inputSchema: z.object({
        region: z.string().optional().describe("NZ region, e.g. 'Auckland'"),
        suburb: z.string().optional().describe("Suburb, e.g. 'Mount Albert'"),
      }),
      execute: async ({ region, suburb }) => {
        const i = await getSuburbInsights(region, suburb);
        return {
          region: i.region,
          suburb: i.suburb,
          hasLiveData: i.hasLiveData,
          kpis: i.kpis.map((k) => ({
            label: k.label,
            value: k.value,
            note: k.sub ?? null,
            changePct: k.delta ?? null,
            indicative: Boolean(k.indicative),
          })),
          nearbySuburbs: i.nearby.slice(0, 6).map((n) => ({
            suburb: n.suburb,
            forSaleNow: n.forSaleNow,
            medianValueIndicative: n.medianValue,
            medianRent: n.medianRent,
            daysOnMarket: n.daysOnMarket,
          })),
        };
      },
    }),

    listLocations: tool({
      description:
        "List the NZ regions and suburbs Trade House covers, plus cities that currently have active listings. Use to ground a vague location or to suggest where to look.",
      inputSchema: z.object({
        region: z
          .string()
          .optional()
          .describe(
            "If given, returns that region's suburbs instead of the region list",
          ),
      }),
      execute: async ({ region }) => {
        if (region) {
          return { region, suburbs: listInsightSuburbs(region) };
        }
        const activeCities = await listSearchCities();
        return { regions: listInsightRegions(), activeCities };
      },
    }),
  };

  // Personalised, read-only tools — only for signed-in users, scoped to their
  // own data via the session (no user id ever comes from the model).
  if (user) {
    tools.getMyAccount = tool({
      description:
        "Get the SIGNED-IN user's own account profile: name, role, account status, member-since date. Use for 'who am I', 'what's my role/account', 'how long have I been a member'.",
      inputSchema: z.object({}),
      execute: async () => ({
        name: user.name || "there",
        role: user.role,
        roleLabel: ROLE_LABELS[user.role] ?? user.role,
        status: user.status,
        memberSince: user.createdAt ?? null,
      }),
    });

    tools.getMySavedListings = tool({
      description:
        "List the listings the SIGNED-IN user has SAVED (their wishlist/favourites). Use for 'my saved listings', 'my wishlist', 'the places I saved'.",
      inputSchema: z.object({}),
      execute: async () => {
        const listings = await listFavoriteListings(user);
        return {
          total: listings.length,
          shown: Math.min(listings.length, MAX_RESULTS),
          savedListings: listings.slice(0, MAX_RESULTS).map(toCard),
        };
      },
    });

    tools.getMyEnquiries = tool({
      description:
        "List enquiries / viewing requests the SIGNED-IN user has SENT to owners (their 'queries'). Use for 'my enquiries', 'my queries', 'did the owner reply', 'requests I've sent'. Returns no contact details.",
      inputSchema: z.object({}),
      execute: async () => {
        const leads = await listSeekerLeads(user);
        return {
          total: leads.length,
          enquiries: leads.slice(0, 15).map((l) => ({
            listing: l.listingTitle,
            suburb: l.listingLocality,
            city: l.listingCity,
            kind: l.kind, // "enquiry" | "viewing"
            status: SEEKER_LEAD_STATUS_LABELS[l.status] ?? l.status,
            sentAt: l.createdAt,
            listingUrl: `/properties/${l.listingId}`,
          })),
        };
      },
    });

    tools.getMySavedSearches = tool({
      description:
        "List the SIGNED-IN user's saved searches WITH a live count of currently-matching listings. Use for 'my saved searches', 'how many matches do my saved searches have'.",
      inputSchema: z.object({}),
      execute: async () => {
        const searches = await listSavedSearches(user);
        // Live match counts for the most recent ~10 (bounds DB + token cost).
        const savedSearches = await Promise.all(
          searches.slice(0, 10).map(async (s) => {
            let matchCount: number | null = null;
            try {
              // s.query is already the canonical (transformed) filter shape, so
              // feed it straight to the repository search — re-parsing through
              // listingQuerySchema would drop cities/openHomes. Mirrors the
              // saved-search alert job.
              const query: ListingQuery = {
                ...s.query,
                page: 1,
                limit: 1,
                sort: "newest",
              };
              matchCount = (await searchListings(query)).total;
            } catch {
              matchCount = null;
            }
            return {
              name: s.name,
              filters: s.query,
              alertsEnabled: s.alertsEnabled,
              matchCount,
            };
          }),
        );
        return { total: searches.length, savedSearches };
      },
    });

    // Owner/agent-only tools. The leads/listings services do NOT gate by role
    // (page-level guards do), so we gate registration here: a seeker never sees
    // these, rather than getting confusing empty results.
    if (can(user.role, "property:manage-own")) {
      tools.searchMyListings = tool({
        description:
          "Search/list the SIGNED-IN owner's OWN listings (ANY status: draft, pending, active, sold, etc.). Use for 'my listings', 'my properties', 'my active/draft listings', 'find my listing titled X'.",
        inputSchema: z.object({
          query: z.string().max(120).optional().describe("Title search"),
          status: z
            .enum(ListingStatus)
            .optional()
            .describe("draft | pending_review | active | rented_sold | expired | rejected"),
          listingType: z
            .enum(ListingType)
            .optional()
            .describe("sale | rent | pg"),
          page: z.number().int().min(1).optional(),
        }),
        execute: async (input) => {
          const query = myListingsQuerySchema.parse({
            q: input.query,
            status: input.status,
            listingType: input.listingType,
            page: input.page ?? 1,
            limit: MAX_RESULTS,
          });
          const result = await searchMyListings(user, query);
          return {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
            shown: Math.min(result.items.length, MAX_RESULTS),
            listings: result.items.slice(0, MAX_RESULTS).map(toOwnerCard),
          };
        },
      });

      tools.getMyListingQuota = tool({
        description:
          "How many listings the SIGNED-IN owner has counting toward their active limit, their limit, and how many more they can publish. Use for 'how many listings can I post', 'my listing limit', 'how many active listings do I have'.",
        inputSchema: z.object({}),
        execute: async () => {
          const activeCount = await countMyActiveListings(user);
          const limit = activeListingLimitFor(user);
          const unlimited = !Number.isFinite(limit);
          return {
            activeCount,
            limit: unlimited ? "unlimited" : limit,
            remaining: unlimited ? "unlimited" : Math.max(0, limit - activeCount),
          };
        },
      });

      tools.getMyReceivedLeads = tool({
        description:
          "Summarise enquiries the SIGNED-IN owner has RECEIVED on their listings: total, a breakdown by status, and the most recent few (listing + status + date). Does NOT expose enquirer contact details — for those, point the owner to the Leads inbox (dashboard → Leads).",
        inputSchema: z.object({}),
        execute: async () => {
          const leads = await listOwnerLeads(user);
          const byStatus: Record<string, number> = {};
          for (const l of leads) {
            const label = LEAD_STATUS_LABELS[l.status] ?? l.status;
            byStatus[label] = (byStatus[label] ?? 0) + 1;
          }
          return {
            totalReceived: leads.length,
            byStatus,
            recent: leads.slice(0, 8).map((l) => ({
              listing: l.listingTitle,
              kind: l.kind,
              status: LEAD_STATUS_LABELS[l.status] ?? l.status,
              receivedAt: l.createdAt,
            })),
          };
        },
      });
    }
  }

  return tools;
}
