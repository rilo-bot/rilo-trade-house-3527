/**
 * Client-safe helpers for turning a search query into a human label and back
 * into a URL. Used for the auto-generated saved-search name and the "Run search"
 * link. Pure functions — no server imports — so they're safe in client code.
 */

const TYPE_LABEL: Record<string, string> = {
  sale: "For sale",
  rent: "Rentals",
  pg: "Flatmates",
};

const money = (v: string): string => {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
};

/** A short, human summary of a search, e.g. "Rentals · Auckland · 2+ bed · ≤ $800". */
export function describeQuery(params: URLSearchParams): string {
  const parts: string[] = [];
  parts.push(TYPE_LABEL[params.get("listingType") ?? ""] ?? "All properties");

  const loc =
    params.get("q") ||
    params.get("locality") ||
    params.get("city") ||
    params.get("cities")?.split(",")[0] ||
    params.get("district") ||
    params.get("region");
  if (loc) parts.push(loc);

  const beds = params.get("bedrooms");
  if (beds && beds !== "0") parts.push(`${beds}+ bed`);

  const min = params.get("minPrice");
  const max = params.get("maxPrice");
  if (min && max) parts.push(`${money(min)}–${money(max)}`);
  else if (max) parts.push(`≤ ${money(max)}`);
  else if (min) parts.push(`≥ ${money(min)}`);

  const pt = params.get("propertyType");
  if (pt) parts.push(pt.replace(/_/g, " "));

  return parts.join(" · ");
}

/** Convert a stored filter object back into URL search params (for re-running). */
export function queryToParams(query: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === false || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else if (value === true) {
      params.set(key, "true");
    } else {
      params.set(key, String(value));
    }
  }
  return params;
}
