import Link from "next/link";
import { getPropertyTypeCounts } from "@/features/listings/listings.service";
import { Reveal } from "@/components/common/reveal";
import { propertyTypeTiles } from "../marketing.data";
import { SectionHeading } from "./section-heading";

/**
 * "Browse by property type" — icon tiles linking to filtered browse results,
 * with live active-listing counts per type (hidden gracefully when zero).
 */
export async function BrowseByType() {
  const counts = await getPropertyTypeCounts();

  return (
    <section className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
      <Reveal>
        <SectionHeading
          title="Browse by property type"
          subtitle="Jump straight to the kind of home you're after."
          className="mb-10"
        />
      </Reveal>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {propertyTypeTiles.map((tile, i) => {
          const Icon = tile.icon;
          const count = counts[tile.type] ?? 0;
          return (
            <Reveal key={tile.type} delay={(i % 6) * 60}>
              <Link
                href={`/properties?propertyType=${tile.type}`}
                className="group border-border bg-card shadow-soft hover:border-primary/30 flex h-full flex-col items-center gap-2.5 rounded-2xl border p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground grid size-12 place-items-center rounded-xl transition-colors">
                  <Icon className="size-6" />
                </span>
                <span className="font-medium">{tile.label}</span>
                <span className="text-muted-foreground text-xs">
                  {count > 0
                    ? `${count} ${count === 1 ? "listing" : "listings"}`
                    : "Explore"}
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
