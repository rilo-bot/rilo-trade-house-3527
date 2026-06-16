"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bath,
  BedDouble,
  DollarSign,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ListingType } from "@/lib/enums";
import { resolvePlace } from "@/lib/nz-locations";
import {
  auctionWindow,
  buildListingParams,
  type FilterValues,
} from "@/features/listings/listing-filters";
import { useListingFilters } from "@/features/listings/use-listing-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { browseHref, cn } from "@/lib/utils";

/**
 * Hero search — a glassy property finder over the hero image. Each tab selects a
 * base listing type (Buy/Rent/Flatmates); the free-text query + Beds/Price/Baths
 * quick filters narrow it. Searching (and "More filters") navigates to that
 * type's dedicated browse page (sale→/buy, rent→/rent, pg→/flatmates via
 * browseHref), carrying the filters in the URL — the full ADVANCED filter set
 * lives on that results page, not on the homepage.
 */

// Sentinel for the "no filter" option (Radix Select forbids an empty value).
const ANY = "any";

const TABS: { label: string; type: ListingType }[] = [
  { label: "Buy", type: ListingType.Sale },
  { label: "Rent", type: ListingType.Rent },
  { label: "Flatmates", type: ListingType.Pg },
];

const BEDS = [
  { label: "Any beds", value: ANY },
  { label: "1+ beds", value: "1" },
  { label: "2+ beds", value: "2" },
  { label: "3+ beds", value: "3" },
  { label: "4+ beds", value: "4" },
  { label: "5+ beds", value: "5" },
];

const BATHS = [
  { label: "Any baths", value: ANY },
  { label: "1+ baths", value: "1" },
  { label: "2+ baths", value: "2" },
  { label: "3+ baths", value: "3" },
];

const PRICES = [
  { label: "Any price", value: ANY },
  { label: "Up to $500k", value: "500000" },
  { label: "Up to $750k", value: "750000" },
  { label: "Up to $1M", value: "1000000" },
  { label: "Up to $1.5M", value: "1500000" },
  { label: "Up to $2M", value: "2000000" },
];

// Popular suburbs surfaced as one-tap chips. Selecting one runs the search for
// the active tab's listing type, resolving the suburb to its region + district
// (so those dropdowns pre-select) and pinning the suburb as the keyword, while
// carrying any filters already chosen.
const POPULAR_SUBURBS = [
  "Ponsonby",
  "Mount Eden",
  "Remuera",
  "Takapuna",
  "Newmarket",
  "Parnell",
  "Devonport",
  "Grey Lynn",
];

export function HeroSearch() {
  const router = useRouter();
  const { values, patch } = useListingFilters({
    listingType: ListingType.Sale,
    sort: "newest",
  });

  // Search mode: "quick" (the classic keyword + dropdowns) or "ai" (a single
  // free-text box parsed into the full filter set by /api/listings/ai-search).
  const [mode, setMode] = useState<"quick" | "ai">("quick");
  const [aiQuery, setAiQuery] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const activeTab = Math.max(
    0,
    TABS.findIndex((t) => t.type === values.listingType),
  );

  // Resolve the typed place text to region/district (so the browse page
  // pre-selects those dropdowns) unless the advanced panel already set an
  // explicit region/district. Mirrors ListingsSearchView's resolution.
  const buildParams = (): URLSearchParams => {
    let region = values.region;
    let district = values.district;
    let q = values.q;
    if (!region && !district && q) {
      const place = resolvePlace(q);
      if (place.region) {
        region = place.region;
        district = place.district;
        // Keep a keyword only when the place was a suburb (to pin it).
        q = place.suburb;
      }
    }
    const merged: FilterValues = { ...values, region, district, q };
    return buildListingParams(merged);
  };

  const runSearch = () => router.push(browseHref(buildParams().toString()));

  // AI mode: send the sentence to the parser, then navigate to the results page
  // with the resolved filters — the same destination quick search uses. The
  // current tab is sent as a listing-type fallback when the text is ambiguous.
  const runAiSearch = async () => {
    const query = aiQuery.trim();
    if (!query || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/listings/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, listingType: values.listingType }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(
          json?.error?.message ??
            "Sorry — I couldn't understand that. Try rephrasing.",
        );
      }
      const filters: FilterValues = json.data.filters;
      // Concrete auction window is computed here so it uses the visitor's local
      // (NZ) wall-clock, matching how auction dates are stored.
      const win = filters.auctionPreset
        ? auctionWindow(filters.auctionPreset)
        : {};
      const merged: FilterValues = {
        ...filters,
        ...win,
        listingType: filters.listingType ?? values.listingType,
      };
      router.push(browseHref(buildListingParams(merged).toString()));
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setAiBusy(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "ai") void runAiSearch();
    else runSearch();
  };

  // Tap a popular suburb: search the active tab's listing type for that suburb
  // (resolved to its region + district), keeping the other chosen filters.
  const handleSuburb = (suburb: string) => {
    const place = resolvePlace(suburb);
    const merged: FilterValues = {
      ...values,
      region: place.region ?? values.region,
      district: place.district ?? values.district,
      q: place.suburb ?? suburb,
    };
    router.push(browseHref(buildListingParams(merged).toString()));
  };

  return (
    <div className="w-full">
      <div className="rounded-3xl border border-white/15 bg-white/10 p-2.5 text-left shadow-2xl backdrop-blur-md sm:p-3">
        {/* Tabs (left) + mode toggle (right). Active tab marked with a white
            underline; the AI toggle flips the input into natural-language mode. */}
        <div className="flex items-center justify-between gap-2 p-1">
          <div className="flex gap-1">
            {TABS.map((t, i) => (
              <button
                key={t.label}
                type="button"
                onClick={() => patch({ listingType: t.type })}
                className={cn(
                  "border-b-2 px-4 py-2 text-sm font-semibold transition-colors",
                  i === activeTab
                    ? "border-white text-white"
                    : "border-transparent text-white/70 hover:border-white/40 hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Quick / AI mode switch. */}
          <div className="flex rounded-full border border-white/20 bg-white/10 p-0.5 backdrop-blur">
            {(["quick", "ai"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setAiError(null);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  mode === m
                    ? "bg-white text-gray-900"
                    : "text-white/80 hover:text-white",
                )}
              >
                {m === "ai" && <Sparkles className="size-3.5" />}
                {m === "ai" ? "AI search" : "Quick"}
              </button>
            ))}
          </div>
        </div>

        {/* Search input + button */}
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-2.5 p-1 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            {mode === "ai" ? (
              <Sparkles className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/60" />
            ) : (
              <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/60" />
            )}
            {mode === "ai" ? (
              <Input
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Describe your ideal home — e.g. “3-bed house in Ponsonby under $1.2M with a garage”"
                className="h-12 rounded-xl border-white/20 bg-white/10 pl-10 text-base text-white backdrop-blur placeholder:text-white/60 focus-visible:border-white/40 focus-visible:ring-white/30"
              />
            ) : (
              <Input
                value={values.q ?? ""}
                onChange={(e) => patch({ q: e.target.value })}
                placeholder="Search by suburb, city, or postcode…"
                className="h-12 rounded-xl border-white/20 bg-white/10 pl-10 text-base text-white backdrop-blur placeholder:text-white/60 focus-visible:border-white/40 focus-visible:ring-white/30"
              />
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={mode === "ai" && (aiBusy || !aiQuery.trim())}
            className="h-12 rounded-xl px-6"
          >
            {mode === "ai" ? (
              aiBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Thinking…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Ask AI
                </>
              )
            ) : (
              <>
                <Search className="size-4" /> Search
              </>
            )}
          </Button>
        </form>

        {/* AI mode helper / error line — replaces the quick filters below. */}
        {mode === "ai" && (
          <p
            className={cn(
              "px-2 pt-1 text-xs",
              aiError ? "text-red-200" : "text-white/60",
            )}
          >
            {aiError ??
              "Ask in plain words — include suburb, beds, budget, and any must-haves. AI fills the filters for you."}
          </p>
        )}

        {/* Quick filters */}
        <div
          className={cn(
            "grid grid-cols-2 gap-2 p-1 pt-1.5 sm:flex sm:flex-wrap sm:items-center",
            mode === "ai" && "hidden",
          )}
        >
          <FilterSelect
            icon={BedDouble}
            value={values.bedrooms ? String(values.bedrooms) : ANY}
            onValueChange={(v) =>
              patch({ bedrooms: v === ANY ? undefined : Number(v) })
            }
            options={BEDS}
          />
          <FilterSelect
            icon={DollarSign}
            value={values.maxPrice ? String(values.maxPrice) : ANY}
            onValueChange={(v) =>
              patch({ maxPrice: v === ANY ? undefined : Number(v) })
            }
            options={PRICES}
          />
          <FilterSelect
            icon={Bath}
            value={values.bathrooms ? String(values.bathrooms) : ANY}
            onValueChange={(v) =>
              patch({ bathrooms: v === ANY ? undefined : Number(v) })
            }
            options={BATHS}
          />
          {/* "More filters" navigates to the selected type's results page,
              where the full advanced filter set lives (not on the homepage). */}
          <Button
            type="button"
            variant="ghost"
            onClick={runSearch}
            className="h-11 w-full gap-1.5 rounded-xl text-white/90 hover:bg-white/10 hover:text-white sm:ml-auto sm:w-auto"
          >
            <SlidersHorizontal className="size-4" /> More filters
          </Button>
        </div>
      </div>

      {/* Popular suburbs — one-tap shortcuts that search the active tab for that
          suburb (carrying the chosen filters). Rendered below the search card. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60">
          <MapPin className="size-3.5" /> Popular
        </span>
        {POPULAR_SUBURBS.map((suburb) => (
          <button
            key={suburb}
            type="button"
            onClick={() => handleSuburb(suburb)}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur transition-colors hover:border-white/40 hover:bg-white/20 hover:text-white"
          >
            {suburb}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One glassy filter dropdown (Beds / Price / Baths). */
function FilterSelect({
  icon: Icon,
  value,
  onValueChange,
  options,
}: {
  icon: LucideIcon;
  value: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-11 w-auto min-w-30 flex-1 gap-2 rounded-xl border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/15 focus-visible:border-white/40 focus-visible:ring-white/30 sm:flex-none">
        <Icon className="size-4 text-white/70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
