"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { PropertyType } from "@/lib/enums";
import { NZ_REGION_NAMES, getDistricts } from "@/lib/nz-locations";
import {
  PROPERTY_TYPE_LABELS,
  formatNZD,
} from "@/features/listings/listing-labels";
import {
  ANY,
  AUCTION_PRESETS,
  BED_BATH,
  PRICE_STEPS,
  auctionWindow,
  buildListingParams,
  countActiveFilters,
  type FilterValues,
} from "@/features/listings/listing-filters";
import { useListingFilters } from "@/features/listings/use-listing-filters";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AdvancedFiltersForm } from "./advanced-filters-form";

// Re-exported for back-compat: callers import the contract from here.
export type { FilterValues };

/**
 * The full property search/filter bar for /properties. The always-visible row
 * holds the common controls; "More filters" reveals the complete advanced set
 * (title type, sale method, CV, parking, area, amenities, …). All controls feed
 * a single `FilterValues` (held by `useListingFilters`); each change rebuilds a
 * URLSearchParams via the shared `buildListingParams` (names match
 * listingQuerySchema) and hands it to `onApply`. Advanced params that arrived in
 * the URL (e.g. from the homepage hero) are preserved because they live in the
 * same state object and are re-emitted on every apply.
 */
export function PropertyFilters({
  initial,
  onApply,
}: {
  initial: FilterValues;
  onApply: (params: URLSearchParams) => void;
}) {
  const { values, patch, reset } = useListingFilters(initial);

  // Merge the change, then apply from the NEXT values (setState is async).
  const apply = (p: Partial<FilterValues> = {}) => {
    const next = { ...values, ...p };
    patch(p);
    onApply(buildListingParams(next));
  };

  const clear = () => {
    reset();
    onApply(buildListingParams({ listingType: initial.listingType }));
  };

  // Debounced keyword search — runs ~400ms after typing stops. `applyRef` reads
  // the latest closure without re-arming the timer each render; `firstRun` skips
  // the initial mount (the parent already fetches the first page).
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => applyRef.current(), 400);
    return () => clearTimeout(t);
  }, [values.q]);

  const advancedCount = countActiveFilters(values);

  return (
    <div className="bg-card/90 z-30 space-y-3 rounded-2xl border border-border p-3 shadow-soft backdrop-blur sm:sticky sm:top-14">
      {/* Row 1 — location + keyword */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Select
          value={values.region || ANY}
          // Selecting a region clears the district + suburbs and searches now.
          onValueChange={(val) =>
            apply({
              region: val === ANY ? "" : val,
              district: "",
              localities: [],
            })
          }
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All New Zealand</SelectItem>
            {NZ_REGION_NAMES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={values.district || ANY}
          onValueChange={(val) =>
            apply({ district: val === ANY ? "" : val, localities: [] })
          }
          disabled={!values.region}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="All districts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>All districts</SelectItem>
            {getDistricts(values.region).map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Keyword — searches as you type (debounced); Enter searches now. */}
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={values.q ?? ""}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Search suburb, title…"
            className="pl-9"
          />
        </div>
      </form>

      {/* Row 2 — refinements */}
      <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 sm:flex sm:flex-wrap sm:items-center">
        <span className="text-muted-foreground hidden items-center gap-1 text-xs sm:flex">
          <SlidersHorizontal className="size-3.5" /> Filters
        </span>

        <PriceSelect
          value={values.minPrice}
          onChange={(minPrice) => apply({ minPrice })}
          placeholder="Min price"
        />
        <PriceSelect
          value={values.maxPrice}
          onChange={(maxPrice) => apply({ maxPrice })}
          placeholder="Max price"
        />

        <CountSelect
          value={values.bedrooms}
          onChange={(bedrooms) => apply({ bedrooms })}
          label="beds"
          placeholder="Beds"
        />
        <CountSelect
          value={values.bathrooms}
          onChange={(bathrooms) => apply({ bathrooms })}
          label="baths"
          placeholder="Baths"
        />

        {/* Property type (single quick pick) */}
        <Select
          value={values.propertyType || ANY}
          onValueChange={(v) => apply({ propertyType: v === ANY ? "" : v })}
        >
          <SelectTrigger className="col-span-2 sm:w-40">
            <SelectValue placeholder="Property type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Any type</SelectItem>
            {Object.values(PropertyType).map((t) => (
              <SelectItem key={t} value={t}>
                {PROPERTY_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Auctions — preset date windows; clearing reverts the soonest sort. */}
        <Select
          value={values.auctionPreset || ANY}
          onValueChange={(v) =>
            v === ANY
              ? apply({
                  auctionPreset: undefined,
                  minAuctionDate: undefined,
                  maxAuctionDate: undefined,
                  sort: values.sort === "auction_soonest" ? "newest" : values.sort,
                })
              : apply({
                  auctionPreset: v,
                  ...auctionWindow(v),
                  sort: "auction_soonest",
                })
          }
        >
          <SelectTrigger className="col-span-2 sm:w-40">
            <SelectValue placeholder="Auctions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>Auctions: any</SelectItem>
            {AUCTION_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Open homes only */}
        <label className="col-span-2 flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={values.openHomes ?? false}
            onChange={(e) => apply({ openHomes: e.target.checked })}
          />
          Open homes only
        </label>

        {/* Sort — applies immediately */}
        <Select
          value={values.sort ?? "newest"}
          onValueChange={(v) => apply({ sort: v })}
        >
          <SelectTrigger className="col-span-2 sm:ml-auto sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Latest</SelectItem>
            <SelectItem value="price_asc">Price: low to high</SelectItem>
            <SelectItem value="price_desc">Price: high to low</SelectItem>
            <SelectItem value="cv_asc">CV: low to high</SelectItem>
            <SelectItem value="cv_desc">CV: high to low</SelectItem>
            <SelectItem value="land_desc">Land area: largest</SelectItem>
            <SelectItem value="floor_desc">Floor area: largest</SelectItem>
            <SelectItem value="auction_soonest">Auction: soonest</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          className="text-muted-foreground col-span-2 w-full sm:w-auto"
        >
          Clear
        </Button>
      </div>

      {/* Advanced filters — a Radix Collapsible that animates to its natural
          content height (collapsible-down/up keyframes), so the open/close is
          smooth regardless of how much is inside. */}
      <div className="border-t border-border pt-2">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="group text-foreground hover:bg-muted/60 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                Advanced filters
                {advancedCount > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                    {advancedCount}
                  </span>
                )}
              </span>
              <ChevronDown className="size-4 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="border-border bg-muted/30 rounded-xl border p-3 sm:p-4">
              <AdvancedFiltersForm values={values} patch={apply} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

function PriceSelect({
  value,
  onChange,
  placeholder,
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  placeholder: string;
}) {
  return (
    <Select
      value={value ? String(value) : ANY}
      onValueChange={(v) => onChange(v === ANY ? undefined : Number(v))}
    >
      <SelectTrigger className="sm:w-32">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{placeholder}</SelectItem>
        {PRICE_STEPS.map((p) => (
          <SelectItem key={p} value={String(p)}>
            {formatNZD(p)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CountSelect({
  value,
  onChange,
  label,
  placeholder,
}: {
  value?: number;
  onChange: (v: number | undefined) => void;
  label: string;
  placeholder: string;
}) {
  return (
    <Select
      value={value ? String(value) : ANY}
      onValueChange={(v) => onChange(v === ANY ? undefined : Number(v))}
    >
      <SelectTrigger className="sm:w-28">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>Any {label}</SelectItem>
        {BED_BATH.map((n) => (
          <SelectItem key={n} value={String(n)}>
            {n}+ {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
