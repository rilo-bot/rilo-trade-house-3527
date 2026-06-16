import type { ListingType } from "@/lib/enums";
import { resolvePlace } from "@/lib/nz-locations";
import { listingQuerySchema } from "@/features/listings/listings.schema";
import { PageHeader } from "@/components/common/page-header";
import { PropertiesBrowser } from "./properties-browser";

/**
 * Shared server view behind the browse routes: `/properties` (all),
 * `/buy`, `/rent`, `/flatmates`. The clean routes pass a `listingType`, which is
 * forced into the query (overriding any `?listingType=` in the URL) so the API
 * always returns the right category. Other filters still come from the URL, so
 * deep links like `/buy?region=Auckland&minPrice=500000` keep working.
 *
 * We DON'T fetch here — the client `PropertiesBrowser` calls /api/listings for
 * the first paint and every search (a real, visible network call).
 */
export async function ListingsSearchView({
  listingType,
  heading,
  eyebrow,
  subtitle,
  searchParams,
}: {
  listingType?: ListingType;
  heading: string;
  eyebrow?: string;
  subtitle?: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  // The route's category wins over anything in the URL.
  if (listingType) flat.listingType = listingType;

  // Coerce/validate; invalid params fall back to defaults rather than crashing
  // (URLs are user-editable and shareable). safeParse keeps the valid params.
  const parsed = listingQuerySchema.safeParse(flat);
  const query = parsed.success ? parsed.data : listingQuerySchema.parse({});

  // When a visitor arrives with only a free-text place (e.g. a shared
  // `?q=Auckland` link) and no explicit region/district, resolve it so the
  // browse dropdowns reflect the place instead of showing "All New Zealand".
  let region = query.region;
  let district = query.district;
  let q = query.q;
  if (!region && !district && q) {
    const place = resolvePlace(q);
    if (place.region) {
      region = place.region;
      district = place.district;
      // An exact region/district is captured by the dropdowns; keep a keyword
      // only when the place was a suburb (to pin it).
      q = place.suburb;
    }
  }

  // Query string for the client's first fetch — the supplied params with the
  // resolved location folded in, so the initial results match the pre-selected
  // dropdowns (the API applies its own defaults for sort/page/limit).
  const effective: Record<string, string | undefined> = {
    ...flat,
    region,
    district,
    q,
  };
  const initialQuery = new URLSearchParams(
    Object.entries(effective).filter(
      (e): e is [string, string] => typeof e[1] === "string" && e[1] !== "",
    ),
  ).toString();

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={heading} subtitle={subtitle} />

      <div className="mx-auto w-full max-w-page px-4 py-8">
        {/* Remount when a SERVER navigation changes the query (e.g. the
            Buy/Rent/Flatmates tabs) so it re-fetches with fresh filters. */}
        <PropertiesBrowser
          key={initialQuery}
          initialFilters={{
            listingType: query.listingType,
            region,
            district,
            localities: query.localities,
            q,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
            minCv: query.minCv,
            maxCv: query.maxCv,
            bedrooms: query.bedrooms,
            bathrooms: query.bathrooms,
            minParking: query.minParking,
            propertyType: query.propertyType,
            propertyTypes: query.propertyTypes,
            category: query.category,
            saleType: query.saleType,
            titleTypes: query.titleTypes,
            priceMethods: query.priceMethods,
            minAuctionDate: query.minAuctionDate,
            maxAuctionDate: query.maxAuctionDate,
            auctionPreset: query.auctionWindow,
            furnishing: query.furnishing,
            pgGender: query.pgGender,
            minYearBuilt: query.minYearBuilt,
            maxYearBuilt: query.maxYearBuilt,
            minLandAreaSqm: query.minLandAreaSqm,
            maxLandAreaSqm: query.maxLandAreaSqm,
            minFloorAreaSqm: query.minFloorAreaSqm,
            maxFloorAreaSqm: query.maxFloorAreaSqm,
            amenities: query.amenities,
            openHomes: query.openHomes,
            sort: query.sort,
          }}
          initialQuery={initialQuery}
        />
      </div>
    </>
  );
}
