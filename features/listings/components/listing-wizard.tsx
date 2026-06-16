"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Briefcase,
  Building,
  Building2,
  DoorOpen,
  Home,
  KeyRound,
  LandPlot,
  Loader2,
  Plus,
  Store,
  Tag,
  Trees,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  AreaUnit,
  Furnishing,
  ListingStatus,
  ListingType,
  PgGender,
  PriceType,
  PropertyCategory,
  PropertyType,
  SaleMethod,
  SaleType,
  TitleType,
} from "@/lib/enums";
import {
  CATEGORY_LABELS,
  FURNISHING_LABELS,
  LISTING_TYPE_LABELS,
  PG_GENDER_LABELS,
  PROPERTY_TYPE_LABELS,
  SALE_METHOD_LABELS,
  SALE_TYPE_LABELS,
  TITLE_TYPE_LABELS,
  formatArea,
  formatPrice,
} from "@/features/listings/listing-labels";
import type { Listing } from "@/features/listings/listings.repository";
import { NZ_REGION_NAMES, getDistricts, getSuburbs } from "@/lib/nz-locations";
import { ImageUploader } from "@/features/listings/components/image-uploader";
import { DescriptionAssist } from "@/features/assistant/components/description-assist";
import type { DescribeFields } from "@/features/assistant/describe.schema";
import { WizardDialog, type WizardStep } from "@/components/common/wizard-dialog";
import { DateTimePicker } from "@/components/common/date-time-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Amenity options vary by the kind of property being listed — a bare section
// and an office have nothing in common with a home. The Photos step shows the
// preset that matches the current selection.
const AMENITY_PRESETS = {
  residential: [
    "Off-street Parking",
    "Garage",
    "Heat Pump",
    "Insulation",
    "Security",
    "Gym",
    "Swimming Pool",
    "Garden",
    "Dishwasher",
    "Fibre Broadband",
  ],
  commercial: [
    "On-site Parking",
    "Air Conditioning",
    "Lift / Elevator",
    "Security System",
    "Kitchenette",
    "Meeting Rooms",
    "Fibre Broadband",
    "Disabled Access",
    "Loading Bay",
  ],
  land: [
    "Power to Boundary",
    "Town Water",
    "Sewer Connected",
    "Fenced",
    "Road Frontage",
    "Building Consent Ready",
    "Flat Contour",
    "Sea / Lake Views",
  ],
} as const;

// Icons + one-line hints for the visual choice cards on the "Type" step (turns
// the old plain dropdowns into a guided, tappable picker).
const LISTING_TYPE_ICONS: Record<ListingType, LucideIcon> = {
  [ListingType.Sale]: Tag,
  [ListingType.Rent]: KeyRound,
  [ListingType.Pg]: Users,
};
const LISTING_TYPE_HINTS: Record<ListingType, string> = {
  [ListingType.Sale]: "Sell your property",
  [ListingType.Rent]: "Lease it out",
  [ListingType.Pg]: "Room / flatshare",
};

const CATEGORY_ICONS: Record<PropertyCategory, LucideIcon> = {
  [PropertyCategory.Residential]: Home,
  [PropertyCategory.Commercial]: Building2,
  [PropertyCategory.Land]: LandPlot,
};
const CATEGORY_HINTS: Record<PropertyCategory, string> = {
  [PropertyCategory.Residential]: "Homes & flats",
  [PropertyCategory.Commercial]: "Office, shop, retail",
  [PropertyCategory.Land]: "Sections & plots",
};

const PROPERTY_TYPE_ICONS: Record<PropertyType, LucideIcon> = {
  [PropertyType.House]: Home,
  [PropertyType.Apartment]: Building2,
  [PropertyType.Townhouse]: Building,
  [PropertyType.Unit]: Building2,
  [PropertyType.Villa]: Home,
  [PropertyType.Studio]: DoorOpen,
  [PropertyType.Section]: LandPlot,
  [PropertyType.Lifestyle]: Trees,
  [PropertyType.Plot]: LandPlot,
  [PropertyType.Office]: Briefcase,
  [PropertyType.Shop]: Store,
  [PropertyType.PgBed]: BedDouble,
};

// Radix Select items can't use an empty string, so we use this sentinel for the
// "Not specified" option on optional enum selects and map it back to "".
const NONE = "none";

function enumOptions(e: Record<string, string>, labels: Record<string, string>) {
  return Object.values(e).map((v) => (
    <SelectItem key={v} value={v}>
      {labels[v]}
    </SelectItem>
  ));
}

/** Compact area-unit selector. Hectares only offered where `withHectare`. */
function UnitSelect({
  value,
  onChange,
  withHectare,
}: {
  value: AreaUnit;
  onChange: (u: AreaUnit) => void;
  withHectare?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AreaUnit)}>
      <SelectTrigger className="w-20 shrink-0 sm:w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={AreaUnit.Sqm}>m²</SelectItem>
        {withHectare && <SelectItem value={AreaUnit.Hectare}>ha</SelectItem>}
        <SelectItem value={AreaUnit.Sqft}>sq ft</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** One open-home viewing window (ISO date-time strings from the inputs). */
interface OpenHomeRow {
  start: string;
  end: string;
}

/** Flat form model. Numeric inputs are kept as strings (how inputs report). */
interface FormState {
  listingType: ListingType;
  saleType: SaleType;
  category: PropertyCategory;
  propertyType: PropertyType;
  title: string;
  description: string;
  // Pricing
  saleMethod: SaleMethod;
  amount: string;
  deposit: string;
  negotiable: boolean;
  auctionDate: string;
  tenderClosesAt: string;
  deadlineAt: string;
  // Auction marketing details (auction listings only).
  priceGuide: string;
  auctionVenue: string;
  livestreamUrl: string;
  // SECRET reserve — never shown to buyers.
  reserve: string;
  // Floor + land area
  areaValue: string;
  areaUnit: AreaUnit;
  landAreaValue: string;
  landAreaUnit: AreaUnit;
  // Config
  bedrooms: string;
  bathrooms: string;
  carSpaces: string;
  garageSpaces: string;
  yearBuilt: string;
  furnishing: Furnishing;
  // Title / valuation
  rateableValue: string;
  titleType: TitleType | "";
  // Location
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  // Public contact number for enquiries/viewings (optional).
  contactPhone: string;
  openHomes: OpenHomeRow[];
  amenities: string[];
  images: string[];
  pgGender: PgGender;
  mealsIncluded: boolean;
}

function buildInitial(l?: Listing): FormState {
  return {
    listingType: l?.listingType ?? ListingType.Sale,
    saleType: l?.saleType ?? SaleType.Ready,
    category: l?.category ?? PropertyCategory.Residential,
    propertyType: l?.propertyType ?? PropertyType.House,
    title: l?.title ?? "",
    description: l?.description ?? "",
    saleMethod: l?.price.method ?? SaleMethod.AskingPrice,
    amount: l?.price.amount != null ? String(l.price.amount) : "",
    deposit: l?.price.deposit != null ? String(l.price.deposit) : "",
    negotiable: l?.price.negotiable ?? false,
    auctionDate: l?.price.auctionDate ?? "",
    tenderClosesAt: l?.price.tenderClosesAt ?? "",
    deadlineAt: l?.price.deadlineAt ?? "",
    priceGuide: l?.price.priceGuide != null ? String(l.price.priceGuide) : "",
    auctionVenue: l?.price.auctionVenue ?? "",
    livestreamUrl: l?.price.livestreamUrl ?? "",
    reserve: l?.price.reserve != null ? String(l.price.reserve) : "",
    areaValue: l?.area?.value != null ? String(l.area.value) : "",
    areaUnit: l?.area?.unit ?? AreaUnit.Sqm,
    landAreaValue: l?.landArea?.value != null ? String(l.landArea.value) : "",
    landAreaUnit: l?.landArea?.unit ?? AreaUnit.Sqm,
    bedrooms: l?.config?.bedrooms != null ? String(l.config.bedrooms) : "",
    bathrooms: l?.config?.bathrooms != null ? String(l.config.bathrooms) : "",
    carSpaces: l?.config?.carSpaces != null ? String(l.config.carSpaces) : "",
    garageSpaces:
      l?.config?.garageSpaces != null ? String(l.config.garageSpaces) : "",
    yearBuilt: l?.config?.yearBuilt != null ? String(l.config.yearBuilt) : "",
    furnishing: l?.config?.furnishing ?? Furnishing.Unfurnished,
    rateableValue: l?.rateableValue != null ? String(l.rateableValue) : "",
    titleType: l?.titleType ?? "",
    address: l?.location.address ?? "",
    locality: l?.location.locality ?? "",
    city: l?.location.city ?? "",
    state: l?.location.state ?? "",
    pincode: l?.location.pincode ?? "",
    contactPhone: l?.contactPhone ?? "",
    openHomes: l?.openHomes ?? [],
    amenities: l?.amenities ?? [],
    images: l?.media?.images ?? [],
    pgGender: l?.pgDetails?.gender ?? PgGender.CoLiving,
    mealsIncluded: l?.pgDetails?.mealsIncluded ?? false,
  };
}

/**
 * Add/edit a listing in a stepped dialog. Reuses the generic WizardDialog +
 * Stepper. Controlled via `open`/`onOpenChange`.
 *   - mode="create": POST, with Publish / Save-draft actions.
 *   - mode="edit":   PATCH `listingId`, with a single Save action.
 */
export function ListingWizardDialog({
  open,
  onOpenChange,
  mode,
  listingId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  listingId?: string;
  initial?: Listing;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitial(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    // Clear inline errors for the fields being edited.
    setFieldErrors((errs) => {
      if (!Object.keys(patch).some((k) => k in errs)) return errs;
      const next = { ...errs };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  // Fresh form each time the dialog opens (defaults for create, values for
  // edit). Adjusting state during render on the open transition is React's
  // recommended alternative to a reset effect, and avoids a cascading render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(buildInitial(initial));
      setError(null);
      setFieldErrors({});
    }
  }

  const isPg = form.listingType === ListingType.Pg;
  const isSale = form.listingType === ListingType.Sale;
  const priceType = isSale ? PriceType.Total : PriceType.Monthly;

  // ---- Property-type-driven field matrix ---------------------------------
  // Which fields the later steps show depends on BOTH the listing type
  // (sale/rent/PG) AND the property type (apartment vs house vs section vs
  // commercial). Treat a listing as "land" if either the category is Land or
  // the property type is a section/plot, so the two selectors stay in sync.
  const isLand =
    form.category === PropertyCategory.Land ||
    form.propertyType === PropertyType.Plot;
  const isCommercial =
    form.category === PropertyCategory.Commercial ||
    form.propertyType === PropertyType.Office ||
    form.propertyType === PropertyType.Shop;
  const isHouseOrVilla =
    form.propertyType === PropertyType.House ||
    form.propertyType === PropertyType.Villa;
  const isRoom = isPg || form.propertyType === PropertyType.PgBed;

  // Field visibility per type.
  const showBedsBaths = !isLand && !isCommercial; // dwellings & rooms
  const showFurnishing = !isLand && !isCommercial; // dwellings & rooms
  const showGarage = isHouseOrVilla; // standalone homes have garaging
  const showCarSpaces = !isLand && !isRoom; // apt/house/villa/commercial
  const showYearBuilt = !isLand; // anything with a building
  const showLandArea = isHouseOrVilla || isLand; // homes with land / sections
  const floorAreaRequired = !isLand; // bare land needn't have a floor area
  const showOwnershipFacts = isSale; // title type + RV are purchase context

  // Amenity options also depend on the property's nature.
  const amenityOptions = isLand
    ? AMENITY_PRESETS.land
    : isCommercial
      ? AMENITY_PRESETS.commercial
      : AMENITY_PRESETS.residential;

  // Sale-method conditionals (NZ): which extra fields the chosen method needs.
  const isAuction = isSale && form.saleMethod === SaleMethod.Auction;
  const isTender = isSale && form.saleMethod === SaleMethod.Tender;
  const isDeadline = isSale && form.saleMethod === SaleMethod.DeadlineSale;
  // Asking-price / enquiries-over quote an upfront figure; others don't.
  const salePriced =
    form.saleMethod === SaleMethod.AskingPrice ||
    form.saleMethod === SaleMethod.EnquiriesOver;
  const needsPrice = !isSale || salePriced;

  const toggleAmenity = (a: string) =>
    set({
      amenities: form.amenities.includes(a)
        ? form.amenities.filter((x) => x !== a)
        : [...form.amenities, a],
    });

  const addOpenHome = () =>
    set({ openHomes: [...form.openHomes, { start: "", end: "" }] });
  const updateOpenHome = (i: number, patch: Partial<OpenHomeRow>) =>
    set({
      openHomes: form.openHomes.map((oh, idx) =>
        idx === i ? { ...oh, ...patch } : oh,
      ),
    });
  const removeOpenHome = (i: number) =>
    set({ openHomes: form.openHomes.filter((_, idx) => idx !== i) });

  // The structured facts handed to the AI description writer. Readable labels
  // (not raw enums) so the model writes naturally; empties dropped.
  const aiDescribeFields = (): DescribeFields => {
    const amount = Number(form.amount);
    return {
      listingType: LISTING_TYPE_LABELS[form.listingType],
      category: CATEGORY_LABELS[form.category],
      propertyType: PROPERTY_TYPE_LABELS[form.propertyType],
      title: form.title.trim() || undefined,
      suburb: form.locality.trim() || undefined,
      city: form.city.trim() || undefined,
      region: form.state.trim() || undefined,
      bedrooms: showBedsBaths && form.bedrooms ? Number(form.bedrooms) : undefined,
      bathrooms:
        showBedsBaths && form.bathrooms ? Number(form.bathrooms) : undefined,
      carSpaces:
        showCarSpaces && form.carSpaces ? Number(form.carSpaces) : undefined,
      floorArea:
        Number(form.areaValue) > 0
          ? formatArea({ value: Number(form.areaValue), unit: form.areaUnit })
          : undefined,
      landArea:
        showLandArea && Number(form.landAreaValue) > 0
          ? formatArea({
              value: Number(form.landAreaValue),
              unit: form.landAreaUnit,
            })
          : undefined,
      furnishing: showFurnishing
        ? FURNISHING_LABELS[form.furnishing]
        : undefined,
      yearBuilt:
        showYearBuilt && form.yearBuilt ? Number(form.yearBuilt) : undefined,
      price:
        needsPrice && amount > 0
          ? `$${amount.toLocaleString("en-NZ")}${isSale ? "" : " per week"}`
          : undefined,
      amenities: form.amenities.length > 0 ? form.amenities : undefined,
      currentDescription: form.description.trim() || undefined,
    };
  };

  const buildPayload = () => ({
    listingType: form.listingType,
    saleType: isSale ? form.saleType : undefined,
    category: form.category,
    propertyType: form.propertyType,
    title: form.title,
    description: form.description,
    price: {
      amount: Number(form.amount) || 0,
      type: priceType,
      // Sale method + its date only apply to for-sale listings.
      method: isSale ? form.saleMethod : undefined,
      auctionDate: isAuction && form.auctionDate ? form.auctionDate : undefined,
      tenderClosesAt:
        isTender && form.tenderClosesAt ? form.tenderClosesAt : undefined,
      deadlineAt: isDeadline && form.deadlineAt ? form.deadlineAt : undefined,
      // Auction marketing details — only persisted for auction listings.
      priceGuide:
        isAuction && Number(form.priceGuide) > 0
          ? Number(form.priceGuide)
          : undefined,
      auctionVenue:
        isAuction && form.auctionVenue.trim()
          ? form.auctionVenue.trim()
          : undefined,
      livestreamUrl:
        isAuction && form.livestreamUrl.trim()
          ? form.livestreamUrl.trim()
          : undefined,
      reserve:
        isAuction && Number(form.reserve) > 0 ? Number(form.reserve) : undefined,
      deposit: form.deposit ? Number(form.deposit) : undefined,
      negotiable: form.negotiable,
    },
    // Floor area is omitted entirely when blank (e.g. a bare section) — the
    // schema accepts a missing area but rejects a zero one.
    area:
      Number(form.areaValue) > 0
        ? { value: Number(form.areaValue), unit: form.areaUnit }
        : undefined,
    landArea:
      showLandArea && form.landAreaValue
        ? { value: Number(form.landAreaValue), unit: form.landAreaUnit }
        : undefined,
    // Only send the config fields that apply to this property type.
    config: {
      bedrooms: showBedsBaths && form.bedrooms ? Number(form.bedrooms) : undefined,
      bathrooms:
        showBedsBaths && form.bathrooms ? Number(form.bathrooms) : undefined,
      carSpaces:
        showCarSpaces && form.carSpaces ? Number(form.carSpaces) : undefined,
      garageSpaces:
        showGarage && form.garageSpaces ? Number(form.garageSpaces) : undefined,
      yearBuilt:
        showYearBuilt && form.yearBuilt ? Number(form.yearBuilt) : undefined,
      furnishing: showFurnishing ? form.furnishing : undefined,
    },
    rateableValue:
      showOwnershipFacts && form.rateableValue
        ? Number(form.rateableValue)
        : undefined,
    titleType: showOwnershipFacts ? form.titleType || undefined : undefined,
    // Keep only fully-filled open-home rows.
    openHomes: form.openHomes.filter((oh) => oh.start && oh.end),
    location: {
      address: form.address,
      locality: form.locality,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
    },
    contactPhone: form.contactPhone.trim() || undefined,
    // Drop any amenities that don't belong to the current type's preset (e.g.
    // a "Garden" left over from before switching the listing to Commercial).
    amenities: form.amenities.filter((a) =>
      (amenityOptions as readonly string[]).includes(a),
    ),
    media: { images: form.images },
    pgDetails: isPg
      ? { gender: form.pgGender, mealsIncluded: form.mealsIncluded, rules: [] }
      : undefined,
  });

  const submit = async (close: () => void, status?: ListingStatus) => {
    setError(null);
    setSubmitting(true);
    try {
      const isEdit = mode === "edit" && listingId;
      const payload = isEdit
        ? buildPayload() // PATCH: status left unchanged
        : { ...buildPayload(), status };

      const res = await fetch(
        isEdit ? `/api/listings/${listingId}` : "/api/listings",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json?.error?.message || "Failed to save listing");
      }
      close();
      // Tell the "Your properties" manager to refetch immediately, and refresh
      // server components (header counts, etc.) so the new/edited listing shows
      // without a manual page reload.
      window.dispatchEvent(new Event("listings:changed"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const steps: WizardStep[] = [
    {
      title: "Type",
      content: (
        <div className="space-y-6">
          <section className="space-y-2">
            <SectionLabel>What are you listing?</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(ListingType).map((t) => (
                <OptionCard
                  key={t}
                  icon={LISTING_TYPE_ICONS[t]}
                  label={LISTING_TYPE_LABELS[t]}
                  hint={LISTING_TYPE_HINTS[t]}
                  selected={form.listingType === t}
                  onClick={() => set({ listingType: t })}
                />
              ))}
            </div>
          </section>

          {isSale && (
            <section className="space-y-2">
              <SectionLabel>Sale type</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {Object.values(SaleType).map((t) => (
                  <Chip
                    key={t}
                    label={SALE_TYPE_LABELS[t]}
                    selected={form.saleType === t}
                    onClick={() => set({ saleType: t })}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <SectionLabel>Property category</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(PropertyCategory).map((c) => (
                <OptionCard
                  key={c}
                  icon={CATEGORY_ICONS[c]}
                  label={CATEGORY_LABELS[c]}
                  hint={CATEGORY_HINTS[c]}
                  selected={form.category === c}
                  onClick={() => set({ category: c })}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <SectionLabel>Property type</SectionLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.values(PropertyType).map((p) => (
                <OptionCard
                  key={p}
                  icon={PROPERTY_TYPE_ICONS[p]}
                  label={PROPERTY_TYPE_LABELS[p]}
                  selected={form.propertyType === p}
                  onClick={() => set({ propertyType: p })}
                  compact
                />
              ))}
            </div>
          </section>
        </div>
      ),
    },
    {
      title: "Details",
      validate: () => {
        const errs: Record<string, string> = {};
        if (form.title.trim().length < 5)
          errs.title = "Title must be at least 5 characters.";
        if (form.description.trim().length < 10)
          errs.description = "Description must be at least 10 characters.";
        if (floorAreaRequired && !(Number(form.areaValue) > 0))
          errs.areaValue = "Enter a valid floor area.";
        if (isLand && !(Number(form.landAreaValue) > 0))
          errs.landAreaValue = "Enter the land area.";
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
      },
      content: (
        <div className="space-y-4">
          <Field label="Title" required error={fieldErrors.title}>
            <Input
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="2-Bedroom Apartment in Ponsonby with parking"
              aria-invalid={!!fieldErrors.title}
            />
          </Field>
          <Field label="Description" required error={fieldErrors.description}>
            <Textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Describe the property, surroundings, and highlights…"
              rows={4}
              aria-invalid={!!fieldErrors.description}
            />
            <DescriptionAssist
              getFields={aiDescribeFields}
              hasDraft={form.description.trim().length > 0}
              onResult={(text) => set({ description: text })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={isLand ? "Floor area (existing dwelling, if any)" : "Floor area"}
              required={floorAreaRequired}
              error={fieldErrors.areaValue}
            >
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={form.areaValue}
                  onChange={(e) => set({ areaValue: e.target.value })}
                  placeholder="120"
                  aria-invalid={!!fieldErrors.areaValue}
                />
                <UnitSelect
                  value={form.areaUnit}
                  onChange={(u) => set({ areaUnit: u })}
                />
              </div>
            </Field>
            {showLandArea && (
              <Field
                label="Land area"
                required={isLand}
                error={fieldErrors.landAreaValue}
              >
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={form.landAreaValue}
                    onChange={(e) => set({ landAreaValue: e.target.value })}
                    placeholder="650"
                    aria-invalid={!!fieldErrors.landAreaValue}
                  />
                  <UnitSelect
                    value={form.landAreaUnit}
                    onChange={(u) => set({ landAreaUnit: u })}
                    withHectare
                  />
                </div>
              </Field>
            )}
          </div>
          {/* Building specs — only the ones that apply to this property type. */}
          {(showBedsBaths ||
            showCarSpaces ||
            showGarage ||
            showYearBuilt ||
            showFurnishing) && (
            <div className="grid gap-4 sm:grid-cols-3">
              {showBedsBaths && (
                <Field label="Bedrooms">
                  <Input
                    type="number"
                    value={form.bedrooms}
                    onChange={(e) => set({ bedrooms: e.target.value })}
                    placeholder="2"
                  />
                </Field>
              )}
              {showBedsBaths && (
                <Field label="Bathrooms">
                  <Input
                    type="number"
                    value={form.bathrooms}
                    onChange={(e) => set({ bathrooms: e.target.value })}
                    placeholder="2"
                  />
                </Field>
              )}
              {showCarSpaces && (
                <Field label="Car spaces">
                  <Input
                    type="number"
                    value={form.carSpaces}
                    onChange={(e) => set({ carSpaces: e.target.value })}
                    placeholder="2"
                  />
                </Field>
              )}
              {showGarage && (
                <Field label="Garage spaces">
                  <Input
                    type="number"
                    value={form.garageSpaces}
                    onChange={(e) => set({ garageSpaces: e.target.value })}
                    placeholder="1"
                  />
                </Field>
              )}
              {showYearBuilt && (
                <Field label="Year built">
                  <Input
                    type="number"
                    value={form.yearBuilt}
                    onChange={(e) => set({ yearBuilt: e.target.value })}
                    placeholder="2015"
                  />
                </Field>
              )}
              {showFurnishing && (
                <Field label="Furnishing">
                  <Select
                    value={form.furnishing}
                    onValueChange={(v) => set({ furnishing: v as Furnishing })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {enumOptions(Furnishing, FURNISHING_LABELS)}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
          )}
          {showOwnershipFacts && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title type">
                <Select
                  value={form.titleType || NONE}
                  onValueChange={(v) =>
                    set({ titleType: v === NONE ? "" : (v as TitleType) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not specified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not specified</SelectItem>
                    {enumOptions(TitleType, TITLE_TYPE_LABELS)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Rateable value (RV/CV)">
                <Input
                  type="number"
                  value={form.rateableValue}
                  onChange={(e) => set({ rateableValue: e.target.value })}
                  placeholder="920000"
                />
              </Field>
            </div>
          )}
          {isPg && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="PG for">
                <Select
                  value={form.pgGender}
                  onValueChange={(v) => set({ pgGender: v as PgGender })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enumOptions(PgGender, PG_GENDER_LABELS)}
                  </SelectContent>
                </Select>
              </Field>
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm">
                <Checkbox
                  checked={form.mealsIncluded}
                  onCheckedChange={(v) => set({ mealsIncluded: v === true })}
                />
                Meals included
              </label>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Pricing",
      validate: () => {
        const errs: Record<string, string> = {};
        if (needsPrice && !(Number(form.amount) > 0))
          errs.amount = "Enter a valid price.";
        if (isAuction && !form.auctionDate)
          errs.auctionDate = "Choose the auction date and time.";
        if (isTender && !form.tenderClosesAt)
          errs.tenderClosesAt = "Choose the tender closing date.";
        if (isDeadline && !form.deadlineAt)
          errs.deadlineAt = "Choose the deadline date.";
        if (
          isAuction &&
          form.livestreamUrl.trim() &&
          !/^https?:\/\//.test(form.livestreamUrl.trim())
        )
          errs.livestreamUrl = "Enter a valid URL (https://…).";
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
      },
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          {isSale && (
            <Field label="Sale method">
              <Select
                value={form.saleMethod}
                onValueChange={(v) => set({ saleMethod: v as SaleMethod })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {enumOptions(SaleMethod, SALE_METHOD_LABELS)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {needsPrice && (
            <Field
              label={
                !isSale
                  ? "Rent ($/week)"
                  : form.saleMethod === SaleMethod.EnquiriesOver
                    ? "Enquiries over ($)"
                    : "Asking price ($)"
              }
              required
              error={fieldErrors.amount}
            >
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => set({ amount: e.target.value })}
                placeholder={isSale ? "850000" : "650"}
                aria-invalid={!!fieldErrors.amount}
              />
            </Field>
          )}

          {isAuction && (
            <Field
              label="Auction date & time"
              required
              error={fieldErrors.auctionDate}
            >
              <DateTimePicker
                value={form.auctionDate}
                onChange={(v) => set({ auctionDate: v })}
                aria-invalid={!!fieldErrors.auctionDate}
                placeholder="Pick auction date & time"
              />
            </Field>
          )}
          {isAuction && (
            <>
              <Field label="Price guide ($) — optional">
                <Input
                  type="number"
                  value={form.priceGuide}
                  onChange={(e) => set({ priceGuide: e.target.value })}
                  placeholder="e.g. 850000"
                />
              </Field>
              <Field label="Auction venue — optional">
                <Input
                  value={form.auctionVenue}
                  onChange={(e) => set({ auctionVenue: e.target.value })}
                  placeholder="On-site, auction rooms, or online"
                />
              </Field>
              <Field
                label="Livestream URL — optional"
                error={fieldErrors.livestreamUrl}
              >
                <Input
                  type="url"
                  inputMode="url"
                  value={form.livestreamUrl}
                  onChange={(e) => set({ livestreamUrl: e.target.value })}
                  aria-invalid={!!fieldErrors.livestreamUrl}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Reserve price ($) — private, optional">
                <Input
                  type="number"
                  value={form.reserve}
                  onChange={(e) => set({ reserve: e.target.value })}
                  placeholder="Not shown to buyers"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Kept confidential. Buyers only see whether the reserve has been
                  met, never the figure.
                </p>
              </Field>
            </>
          )}
          {isTender && (
            <Field
              label="Tender closes"
              required
              error={fieldErrors.tenderClosesAt}
            >
              <DateTimePicker
                value={form.tenderClosesAt}
                onChange={(v) => set({ tenderClosesAt: v })}
                aria-invalid={!!fieldErrors.tenderClosesAt}
                placeholder="Pick tender closing date & time"
              />
            </Field>
          )}
          {isDeadline && (
            <Field
              label="Deadline date"
              required
              error={fieldErrors.deadlineAt}
            >
              <DateTimePicker
                value={form.deadlineAt}
                onChange={(v) => set({ deadlineAt: v })}
                aria-invalid={!!fieldErrors.deadlineAt}
                placeholder="Pick deadline date & time"
              />
            </Field>
          )}

          {!isSale && (
            <Field label="Bond ($)">
              <Input
                type="number"
                value={form.deposit}
                onChange={(e) => set({ deposit: e.target.value })}
                placeholder="2600"
              />
            </Field>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={form.negotiable}
              onCheckedChange={(v) => set({ negotiable: v === true })}
            />
            Price negotiable
          </label>

          {/* Open homes — scheduled viewing windows (TradeMe style). */}
          <div className="space-y-2 sm:col-span-2">
            <Label>Open homes</Label>
            {form.openHomes.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No open homes scheduled yet.
              </p>
            )}
            <div className="space-y-2">
              {form.openHomes.map((oh, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
                >
                  <div className="flex-1">
                    <DateTimePicker
                      value={oh.start}
                      onChange={(v) => updateOpenHome(i, { start: v })}
                      placeholder="Start"
                    />
                  </div>
                  <span className="text-muted-foreground hidden text-sm sm:inline">
                    to
                  </span>
                  <div className="flex-1">
                    <DateTimePicker
                      value={oh.end}
                      onChange={(v) => updateOpenHome(i, { end: v })}
                      placeholder="End"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOpenHome(i)}
                    aria-label="Remove open home"
                    className="text-muted-foreground hover:text-destructive self-end rounded-md p-2 sm:self-auto"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOpenHome}
            >
              <Plus className="size-4" /> Add open home
            </Button>
          </div>
        </div>
      ),
    },
    {
      title: "Location",
      validate: () => {
        const errs: Record<string, string> = {};
        if (!form.address.trim()) errs.address = "Address is required.";
        if (!form.state.trim()) errs.state = "Region is required.";
        if (!form.city.trim()) errs.city = "District is required.";
        if (!form.locality.trim()) errs.locality = "Suburb is required.";
        if (!/^\d{4}$/.test(form.pincode))
          errs.pincode = "Enter a valid 4-digit postcode.";
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
      },
      content: (
        <div className="space-y-4">
          <Field label="Address" required error={fieldErrors.address}>
            <Input
              value={form.address}
              onChange={(e) => set({ address: e.target.value })}
              placeholder="Building, street"
              aria-invalid={!!fieldErrors.address}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Region" required error={fieldErrors.state}>
              <Select
                value={form.state || undefined}
                // Changing region clears the district + suburb below it.
                onValueChange={(v) => set({ state: v, city: "", locality: "" })}
              >
                <SelectTrigger aria-invalid={!!fieldErrors.state}>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {NZ_REGION_NAMES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="District" required error={fieldErrors.city}>
              <Select
                value={form.city || undefined}
                // Changing district clears the suburb (it belongs to a district).
                onValueChange={(v) => set({ city: v, locality: "" })}
                disabled={!form.state}
              >
                <SelectTrigger aria-invalid={!!fieldErrors.city}>
                  <SelectValue
                    placeholder={
                      form.state ? "Select district" : "Choose a region first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {getDistricts(form.state).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Suburb" required error={fieldErrors.locality}>
              <SuburbSelect
                // Remount when the district changes so the picker resets to the
                // new district's suburb list.
                key={form.city}
                district={form.city}
                value={form.locality}
                onChange={(v) => set({ locality: v })}
                invalid={!!fieldErrors.locality}
              />
            </Field>
            <Field label="Postcode" required error={fieldErrors.pincode}>
              <Input
                value={form.pincode}
                onChange={(e) => set({ pincode: e.target.value })}
                placeholder="1011"
                aria-invalid={!!fieldErrors.pincode}
              />
            </Field>
            <Field label="Contact phone (optional)" error={fieldErrors.contactPhone}>
              <Input
                value={form.contactPhone}
                onChange={(e) => set({ contactPhone: e.target.value })}
                placeholder="021 123 4567"
                aria-invalid={!!fieldErrors.contactPhone}
              />
            </Field>
          </div>
        </div>
      ),
    },
    {
      title: "Photos",
      content: (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-2">
              {amenityOptions.map((a) => {
                const on = form.amenities.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      on
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Photos</Label>
            <ImageUploader
              value={form.images}
              onChange={(images) => set({ images })}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Review",
      content: (
        <div className="space-y-3 text-sm">
          <Review label="Listing" value={LISTING_TYPE_LABELS[form.listingType]} />
          <Review label="Type" value={PROPERTY_TYPE_LABELS[form.propertyType]} />
          <Review label="Title" value={form.title || "—"} />
          {isSale && (
            <Review
              label="Sale method"
              value={SALE_METHOD_LABELS[form.saleMethod]}
            />
          )}
          <Review
            label="Price"
            value={
              needsPrice
                ? formatPrice({ amount: Number(form.amount) || 0, type: priceType })
                : SALE_METHOD_LABELS[form.saleMethod]
            }
          />
          <Review
            label="Floor area"
            value={
              form.areaValue
                ? formatArea({ value: Number(form.areaValue), unit: form.areaUnit })
                : "—"
            }
          />
          {showLandArea && form.landAreaValue && (
            <Review
              label="Land area"
              value={formatArea({
                value: Number(form.landAreaValue),
                unit: form.landAreaUnit,
              })}
            />
          )}
          {showCarSpaces && form.carSpaces && (
            <Review label="Car spaces" value={form.carSpaces} />
          )}
          {showOwnershipFacts && form.titleType && (
            <Review label="Title" value={TITLE_TYPE_LABELS[form.titleType]} />
          )}
          {showOwnershipFacts && form.rateableValue && (
            <Review
              label="RV / CV"
              value={`$${Number(form.rateableValue).toLocaleString("en-NZ")}`}
            />
          )}
          {form.openHomes.filter((o) => o.start && o.end).length > 0 && (
            <Review
              label="Open homes"
              value={`${form.openHomes.filter((o) => o.start && o.end).length} scheduled`}
            />
          )}
          <Review
            label="Location"
            value={
              [form.locality, form.city, form.state].filter(Boolean).join(", ") ||
              "—"
            }
          />
          <Review label="Photos" value={`${form.images.length} added`} />
        </div>
      ),
    },
  ];

  return (
    <WizardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit property" : "Post a property"}
      description={
        mode === "edit"
          ? "Update your listing details."
          : "Fill the steps below to list your property."
      }
      steps={steps}
      error={error}
      busy={submitting}
      finalActions={(close) =>
        mode === "edit" ? (
          <Button
            type="button"
            onClick={() => submit(close)}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit(close, ListingStatus.Draft)}
              disabled={submitting}
            >
              Save draft
            </Button>
            <Button
              type="button"
              onClick={() => submit(close, ListingStatus.Active)}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Publish
            </Button>
          </>
        )
      }
    />
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={error ? "text-destructive" : undefined}>
        {label}
        {required && (
          <span className="text-destructive ml-0.5" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

/** Group heading for the visual choice sections on the Type step. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-none font-medium">{children}</p>;
}

/** Selectable tile (icon + label + optional hint) for the Type step. */
function OptionCard({
  icon: Icon,
  label,
  hint,
  selected,
  onClick,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
        selected
          ? "border-primary bg-primary/5 ring-primary/30 text-foreground ring-1"
          : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted",
      )}
    >
      <Icon className={cn("size-5", selected && "text-primary")} />
      <span
        className={cn(
          "text-xs leading-tight font-medium",
          compact && "text-[11px]",
        )}
      >
        {label}
      </span>
      {hint && (
        <span className="text-[10px] leading-tight opacity-70">{hint}</span>
      )}
    </button>
  );
}

/** Compact pill toggle for secondary single-select rows (e.g. sale type). */
function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// Sentinel for the "type my own suburb" option in the suburb dropdown.
const SUBURB_OTHER = "__other__";

/**
 * Suburb picker. Shows a dropdown of real suburbs for the chosen district when
 * we have data for it (see `NZ_SUBURBS`); districts without a list — and any
 * suburb not on the list (via "Other") — fall back to a free-text input, so any
 * NZ suburb can still be entered. Remounted (keyed) on district change.
 */
function SuburbSelect({
  district,
  value,
  onChange,
  invalid,
}: {
  district: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const suburbs = getSuburbs(district);
  const inList = !!value && suburbs.includes(value);
  // Free-text mode when there's no list for this district, or the existing value
  // isn't one of the known suburbs (e.g. editing a previously-typed one).
  const [manual, setManual] = useState(
    suburbs.length === 0 || (!!value && !inList),
  );

  if (suburbs.length === 0 || manual) {
    return (
      <div className="space-y-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ponsonby"
          aria-invalid={invalid}
        />
        {suburbs.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setManual(false);
            }}
            className="text-primary text-xs hover:underline"
          >
            Choose from list instead
          </button>
        )}
      </div>
    );
  }

  return (
    <Select
      value={inList ? value : undefined}
      onValueChange={(v) => {
        if (v === SUBURB_OTHER) {
          onChange("");
          setManual(true);
        } else {
          onChange(v);
        }
      }}
    >
      <SelectTrigger aria-invalid={invalid}>
        <SelectValue placeholder="Select suburb" />
      </SelectTrigger>
      <SelectContent>
        {suburbs.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
        <SelectItem value={SUBURB_OTHER}>Other (type it in)…</SelectItem>
      </SelectContent>
    </Select>
  );
}
