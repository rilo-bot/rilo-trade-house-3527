"use client";

import {
  BedDouble,
  MapPin,
  Ruler,
  ScrollText,
  Tag,
} from "lucide-react";
import {
  Furnishing,
  PgGender,
  PropertyCategory,
  PropertyType,
  SaleMethod,
  SaleType,
  TitleType,
} from "@/lib/enums";
import {
  NZ_REGION_NAMES,
  getDistricts,
  getSuburbs,
} from "@/lib/nz-locations";
import {
  CATEGORY_LABELS,
  FURNISHING_LABELS,
  PG_GENDER_LABELS,
  PROPERTY_TYPE_LABELS,
  SALE_METHOD_LABELS,
  SALE_TYPE_LABELS,
  TITLE_TYPE_LABELS,
  formatNZD,
} from "@/features/listings/listing-labels";
import {
  ANY,
  BED_BATH,
  COMMON_AMENITIES,
  CV_STEPS,
  PARKING,
  PRICE_STEPS,
  type FilterValues,
} from "@/features/listings/listing-filters";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/common/multi-select";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

const enumOptions = <T extends Record<string, string>>(
  enumObj: T,
  labels: Record<string, string>,
): Option[] =>
  Object.values(enumObj).map((v) => ({ value: v, label: labels[v] ?? v }));

/**
 * The grouped advanced-filter form, shared by the homepage hero panel and the
 * results-page "More filters" disclosure. Purely presentational: it renders
 * controls bound to `values` and reports edits via `patch`. The PARENT decides
 * when to act (the hero submits on "Search"; the results page applies instantly).
 */
export function AdvancedFiltersForm({
  values,
  patch,
  className,
}: {
  values: FilterValues;
  patch: (p: Partial<FilterValues>) => void;
  className?: string;
}) {
  const districts = getDistricts(values.region);
  const suburbs = getSuburbs(values.district);

  const type = values.listingType;
  const isSale = !type || type === "sale";
  const isRent = !type || type === "rent";
  const isPg = !type || type === "pg";

  return (
    <Accordion
      type="multiple"
      className={cn("divide-y divide-border", className)}
    >
      {/* ── Location ── */}
      <AccordionItem value="location">
        <AccordionTrigger className="py-3.5 text-sm">
          <span className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4" /> Location
          </span>
        </AccordionTrigger>
        <AccordionContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Region">
            <Select
              value={values.region || ANY}
              onValueChange={(v) =>
                patch({
                  region: v === ANY ? "" : v,
                  district: "",
                  localities: [],
                })
              }
            >
              <SelectTrigger className="w-full">
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
          </Field>

          <Field label="District">
            <Select
              value={values.district || ANY}
              onValueChange={(v) =>
                patch({ district: v === ANY ? "" : v, localities: [] })
              }
              disabled={!values.region}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Suburbs" className="sm:col-span-2">
            <MultiSelect
              options={[...suburbs]}
              value={values.localities ?? []}
              onChange={(localities) => patch({ localities })}
              placeholder={
                values.district ? "Any suburb" : "Pick a district first"
              }
            />
          </Field>

          <Field label="Keyword" className="sm:col-span-2">
            <Input
              value={values.q ?? ""}
              onChange={(e) => patch({ q: e.target.value })}
              placeholder="Search title, street, postcode…"
            />
          </Field>
        </AccordionContent>
      </AccordionItem>

      {/* ── Price & type ── */}
      <AccordionItem value="price">
        <AccordionTrigger className="py-3.5 text-sm">
          <span className="flex items-center gap-2">
            <Tag className="text-muted-foreground size-4" /> Price &amp; type
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min price">
              <StepSelect
                steps={PRICE_STEPS}
                value={values.minPrice}
                onChange={(minPrice) => patch({ minPrice })}
                placeholder="No min"
              />
            </Field>
            <Field label="Max price">
              <StepSelect
                steps={PRICE_STEPS}
                value={values.maxPrice}
                onChange={(maxPrice) => patch({ maxPrice })}
                placeholder="No max"
              />
            </Field>
          </div>

          <Field label="Property type">
            <ToggleChips
              options={enumOptions(PropertyType, PROPERTY_TYPE_LABELS)}
              value={values.propertyTypes ?? []}
              onChange={(propertyTypes) => patch({ propertyTypes })}
            />
          </Field>

          <Field label="Category">
            <SingleSelect
              options={enumOptions(PropertyCategory, CATEGORY_LABELS)}
              value={values.category}
              onChange={(category) => patch({ category })}
              anyLabel="Any category"
            />
          </Field>

          {isSale && (
            <>
              <Field label="Sale type">
                <SingleSelect
                  options={enumOptions(SaleType, SALE_TYPE_LABELS)}
                  value={values.saleType}
                  onChange={(saleType) => patch({ saleType })}
                  anyLabel="Any sale type"
                />
              </Field>
              <Field label="Sale method">
                <ToggleChips
                  options={enumOptions(SaleMethod, SALE_METHOD_LABELS)}
                  value={values.priceMethods ?? []}
                  onChange={(priceMethods) => patch({ priceMethods })}
                />
              </Field>
            </>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* ── Rooms & parking ── */}
      <AccordionItem value="rooms">
        <AccordionTrigger className="py-3.5 text-sm">
          <span className="flex items-center gap-2">
            <BedDouble className="text-muted-foreground size-4" /> Rooms &amp;
            parking
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Beds (min)">
              <CountSelect
                steps={BED_BATH}
                value={values.bedrooms}
                onChange={(bedrooms) => patch({ bedrooms })}
              />
            </Field>
            <Field label="Baths (min)">
              <CountSelect
                steps={BED_BATH}
                value={values.bathrooms}
                onChange={(bathrooms) => patch({ bathrooms })}
              />
            </Field>
            <Field label="Parking (min)">
              <CountSelect
                steps={PARKING}
                value={values.minParking}
                onChange={(minParking) => patch({ minParking })}
              />
            </Field>
          </div>

          <Field label="Year built">
            <RangeInputs
              min={values.minYearBuilt}
              max={values.maxYearBuilt}
              onChange={(minYearBuilt, maxYearBuilt) =>
                patch({ minYearBuilt, maxYearBuilt })
              }
              minPlaceholder="From"
              maxPlaceholder="To"
            />
          </Field>
        </AccordionContent>
      </AccordionItem>

      {/* ── NZ attributes ── */}
      <AccordionItem value="attributes">
        <AccordionTrigger className="py-3.5 text-sm">
          <span className="flex items-center gap-2">
            <ScrollText className="text-muted-foreground size-4" /> Property
            attributes
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          <Field label="Title type">
            <ToggleChips
              options={enumOptions(TitleType, TITLE_TYPE_LABELS)}
              value={values.titleTypes ?? []}
              onChange={(titleTypes) => patch({ titleTypes })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min CV (RV)">
              <StepSelect
                steps={CV_STEPS}
                value={values.minCv}
                onChange={(minCv) => patch({ minCv })}
                placeholder="No min"
              />
            </Field>
            <Field label="Max CV (RV)">
              <StepSelect
                steps={CV_STEPS}
                value={values.maxCv}
                onChange={(maxCv) => patch({ maxCv })}
                placeholder="No max"
              />
            </Field>
          </div>

          {(isRent || isPg) && (
            <Field label="Furnishing">
              <SingleSelect
                options={enumOptions(Furnishing, FURNISHING_LABELS)}
                value={values.furnishing}
                onChange={(furnishing) => patch({ furnishing })}
                anyLabel="Any"
              />
            </Field>
          )}

          {isPg && (
            <Field label="Flatmate preference">
              <SingleSelect
                options={enumOptions(PgGender, PG_GENDER_LABELS)}
                value={values.pgGender}
                onChange={(pgGender) => patch({ pgGender })}
                anyLabel="Any"
              />
            </Field>
          )}

          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.openHomes ?? false}
              onChange={(e) => patch({ openHomes: e.target.checked })}
              className="accent-primary size-4 rounded"
            />
            Open homes only
          </label>
        </AccordionContent>
      </AccordionItem>

      {/* ── Land, floor area & features ── */}
      <AccordionItem value="size">
        <AccordionTrigger className="py-3.5 text-sm">
          <span className="flex items-center gap-2">
            <Ruler className="text-muted-foreground size-4" /> Size &amp;
            features
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4">
          <Field label="Land area (m²)">
            <RangeInputs
              min={values.minLandAreaSqm}
              max={values.maxLandAreaSqm}
              onChange={(minLandAreaSqm, maxLandAreaSqm) =>
                patch({ minLandAreaSqm, maxLandAreaSqm })
              }
              minPlaceholder="Min m²"
              maxPlaceholder="Max m²"
            />
          </Field>
          <Field label="Floor area (m²)">
            <RangeInputs
              min={values.minFloorAreaSqm}
              max={values.maxFloorAreaSqm}
              onChange={(minFloorAreaSqm, maxFloorAreaSqm) =>
                patch({ minFloorAreaSqm, maxFloorAreaSqm })
              }
              minPlaceholder="Min m²"
              maxPlaceholder="Max m²"
            />
          </Field>
          <Field label="Must have">
            <ToggleChips
              options={COMMON_AMENITIES.map((a) => ({ value: a, label: a }))}
              value={values.amenities ?? []}
              onChange={(amenities) => patch({ amenities })}
            />
          </Field>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/* ── Field primitives ──────────────────────────────────────────────────── */

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}

/** Single-select dropdown with an "Any" sentinel that maps to undefined. */
function SingleSelect({
  options,
  value,
  onChange,
  anyLabel,
}: {
  options: Option[];
  value?: string;
  onChange: (v: string | undefined) => void;
  anyLabel: string;
}) {
  return (
    <Select
      value={value || ANY}
      onValueChange={(v) => onChange(v === ANY ? undefined : v)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={anyLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{anyLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A price/CV step dropdown; emits a number (or undefined for "Any"). */
function StepSelect({
  steps,
  value,
  onChange,
  placeholder,
}: {
  steps: number[];
  value?: number;
  onChange: (v: number | undefined) => void;
  placeholder: string;
}) {
  return (
    <Select
      value={value ? String(value) : ANY}
      onValueChange={(v) => onChange(v === ANY ? undefined : Number(v))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{placeholder}</SelectItem>
        {steps.map((s) => (
          <SelectItem key={s} value={String(s)}>
            {formatNZD(s)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A minimum-count dropdown ("2+"); emits a number (or undefined for "Any"). */
function CountSelect({
  steps,
  value,
  onChange,
}: {
  steps: number[];
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <Select
      value={value ? String(value) : ANY}
      onValueChange={(v) => onChange(v === ANY ? undefined : Number(v))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Any" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>Any</SelectItem>
        {steps.map((s) => (
          <SelectItem key={s} value={String(s)}>
            {s}+
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** A min/max pair of numeric inputs; emits both (undefined when blank). */
function RangeInputs({
  min,
  max,
  onChange,
  minPlaceholder,
  maxPlaceholder,
}: {
  min?: number;
  max?: number;
  onChange: (min: number | undefined, max: number | undefined) => void;
  minPlaceholder: string;
  maxPlaceholder: string;
}) {
  const parse = (s: string) => (s.trim() === "" ? undefined : Number(s));
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={min ?? ""}
        onChange={(e) => onChange(parse(e.target.value), max)}
        placeholder={minPlaceholder}
      />
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={max ?? ""}
        onChange={(e) => onChange(min, parse(e.target.value))}
        placeholder={maxPlaceholder}
      />
    </div>
  );
}

/** A toggleable pill multi-select for enum/feature options. */
function ToggleChips({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) =>
    onChange(
      value.includes(val) ? value.filter((v) => v !== val) : [...value, val],
    );
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(o.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-primary/50",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
