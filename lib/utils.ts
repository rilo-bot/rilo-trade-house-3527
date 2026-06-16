import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Small, generic, dependency-free helpers reused across the app. Keep these
 * pure and broadly useful; feature-specific helpers belong in the feature.
 */

/** Merge Tailwind class names, resolving conflicts (used by shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date as a localized string. Accepts a Date, ISO string, or epoch ms. */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
  locale = "en-US",
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}

/** Promise-based delay. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** URL/SEO-friendly slug from arbitrary text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Truncate text to `length` chars, appending an ellipsis when cut. */
export function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

/**
 * Normalize a stored image URL for display. Raw S3 URLs (`*.amazonaws.com`)
 * point at a private bucket and 403 in the browser, so we reroute listing
 * images through our same-origin proxy (`/api/uploads/<key>`). Already-relative
 * URLs and non-S3 hosts (CDN, Unsplash, etc.) pass through unchanged. Pure and
 * client-safe — no env access. Mirrors `publicUrl()` in lib/s3.ts.
 */
export function imageSrc(url: string): string {
  if (!url || url.startsWith("/")) return url;
  const i = url.indexOf("/listings/");
  if (i !== -1 && /\.amazonaws\.com\//.test(url)) {
    return `/api/uploads${url.slice(i)}`;
  }
  return url;
}

/**
 * Build the clean browse URL for a search query string. The `listingType`
 * becomes the route (`sale`→`/buy`, `rent`→`/rent`, `pg`→`/flatmates`; no type
 * → `/properties`); the remaining params stay in the query. So a home search
 * for rentals in Wellington links to `/rent?region=Wellington`, not
 * `/properties?listingType=rent&region=Wellington`.
 */
export function browseHref(query?: string): string {
  const params = new URLSearchParams(query ?? "");
  const type = params.get("listingType");
  const base =
    type === "sale"
      ? "/buy"
      : type === "rent"
        ? "/rent"
        : type === "pg"
          ? "/flatmates"
          : "/properties";
  params.delete("listingType");
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

/**
 * NZ mobile-number matcher. Accepts numbers written with spaces, dashes, or
 * parentheses, in national (`021 123 4567`) or international (`+64 21 123 4567`)
 * form. NZ mobiles are `02X` + 6–8 digits where the prefix is one of
 * 020/021/022/027/028/029; the international form may drop the leading 0.
 */
const NZ_MOBILE_REGEX = /^(?:(?:\+?64)0?|0)2[012789]\d{6,8}$/;

/** True when `value` is a valid NZ mobile number (ignoring spaces/dashes). */
export function isValidNZMobile(value: string): boolean {
  return NZ_MOBILE_REGEX.test(value.replace(/[\s()-]/g, ""));
}

/** True for `null`, `undefined`, empty string, empty array, or empty object. */
export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" || Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }
  return false;
}
