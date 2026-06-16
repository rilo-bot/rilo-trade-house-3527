import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ListingType } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/common/reveal";
import { OptimizedImage } from "@/components/common/optimized-image";
import { getListingTypeCounts } from "@/features/listings/listings.service";
import { quickActions, type QuickAction } from "../marketing.data";
import { SectionHeading } from "./section-heading";

/**
 * "Everything you need, in one place" — a photographic bento of the four
 * primary journeys. Each tile is a real property photo under a navy scrim (so
 * white text + the live listing-count badge stay legible), with a frosted icon
 * chip and a CTA arrow. "Buy" is the large featured tile; the rest are smaller.
 * Counts are the real number of active listings per category, queried
 * server-side. Hover lift + image zoom are gated to `motion-safe`.
 */
export async function QuickActions() {
  const counts = await getListingTypeCounts();
  const listingLabel = (n?: number) =>
    n && n > 0 ? `${n.toLocaleString()} listings` : null;

  const [buy, rent, flat, sell] = quickActions;

  return (
    <section className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
      <Reveal>
        <SectionHeading
          title="Everything you need, in one place"
          subtitle="From buying to selling, renting to investing - we've got you."
          className="mb-10"
        />
      </Reveal>

      {/* Bento: a tall featured "Buy" tile (2×2), two square tiles (Rent,
          Flatmates), and one wide "Sell" tile. Row height scales up on larger
          screens so the tiles never flatten into squat letterboxes. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:auto-rows-[14rem] lg:grid-cols-4 lg:gap-5 xl:auto-rows-[16rem]">
        {/* Buy — large featured tile */}
        <Reveal className="h-full lg:col-span-2 lg:row-span-2">
          <ActionTile
            action={buy}
            featured
            wide
            badge={listingLabel(counts[ListingType.Sale])}
            cta="Browse homes for sale"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </Reveal>

        {/* Rent — square tile */}
        <Reveal className="h-full" delay={80}>
          <ActionTile
            action={rent}
            badge={listingLabel(counts[ListingType.Rent])}
            cta="Find a rental"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </Reveal>

        {/* Flatmates — square tile */}
        <Reveal className="h-full" delay={160}>
          <ActionTile
            action={flat}
            badge={listingLabel(counts[ListingType.Pg])}
            cta="Find flatmates"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </Reveal>

        {/* Sell / list — wide tile */}
        <Reveal className="h-full lg:col-span-2" delay={240}>
          <ActionTile
            action={sell}
            wide
            badge="Free to list"
            cta="List your property"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </Reveal>
      </div>
    </section>
  );
}

/** A single photographic bento tile: photo + navy scrim + overlaid content. */
function ActionTile({
  action,
  featured = false,
  wide = false,
  badge,
  cta,
  sizes,
  priority,
}: {
  action: QuickAction;
  featured?: boolean;
  /** Show the description line (used on the larger Buy + Rent tiles). */
  wide?: boolean;
  badge?: string | null;
  cta: string;
  sizes: string;
  priority?: boolean;
}) {
  const Icon = action.icon;
  return (
    <Link
      href={action.href}
      className={cn(
        "group shadow-soft relative flex h-full flex-col justify-between overflow-hidden rounded-2xl outline-none transition-all duration-300",
        "hover:shadow-lg motion-safe:hover:-translate-y-1",
        "focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2",
        featured ? "min-h-56 sm:min-h-64" : "min-h-36 sm:min-h-38",
      )}
    >
      {/* Photo fills the tile and zooms gently on hover. */}
      <OptimizedImage
        src={action.image}
        alt={action.imageAlt}
        aspect=""
        rounded={false}
        sizes={sizes}
        priority={priority}
        className="absolute inset-0 transition-transform duration-700 ease-out motion-safe:group-hover:scale-105"
      />
      {/* Navy scrim keeps white text legible over any photo. */}
      <div
        aria-hidden
        className="from-brand/95 via-brand/45 absolute inset-0 bg-linear-to-t to-transparent"
      />

      {/* Top row: frosted icon chip + count / badge. */}
      <div className="relative flex items-start justify-between p-5 pb-0">
        <span
          className={cn(
            "grid place-items-center rounded-xl bg-white/15 text-white backdrop-blur",
            featured ? "size-12" : "size-10",
          )}
        >
          <Icon className={featured ? "size-6" : "size-5"} />
        </span>
        {badge && (
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {badge}
          </span>
        )}
      </div>

      {/* Bottom: title, optional description, CTA. */}
      <div className="relative p-5 pt-0">
        <h3
          className={cn(
            "font-display font-bold tracking-tight text-white",
            featured ? "text-2xl" : "text-lg",
          )}
        >
          {action.title}
        </h3>
        {wide && (
          <p className="mt-1.5 max-w-sm text-pretty text-sm text-white/85">
            {action.description}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
          {cta}
          <ArrowRight className="size-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
