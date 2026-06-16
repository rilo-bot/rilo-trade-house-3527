import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/common/reveal";
import { getCityListingCounts } from "@/features/listings/listings.service";
import { resolvePlace } from "@/lib/nz-locations";
import { topCities } from "../marketing.data";
import { SectionHeading } from "./section-heading";

/**
 * "Explore real estate in top cities" — photo tiles on a tinted band. Each tile
 * shows the real number of active listings in that place (queried server-side)
 * and links straight to its filtered browse search.
 *
 * Tile names are main centres, which can be a region (Auckland, Wellington) or a
 * district (Christchurch, Hamilton). We resolve each to region/district and link
 * with those params (`/properties?region=…&district=…`) so the landed page
 * pre-selects the region/district dropdowns AND its result count matches the
 * number shown on the tile (both keyed off the same resolved place).
 */
export async function TopCities() {
  const counts = await getCityListingCounts();

  return (
    <section className="bg-accent">
      <div className="mx-auto w-full max-w-page px-4 py-16 sm:py-20">
        <Reveal>
          <SectionHeading
            title="Explore your Dream house in top cities"
            subtitle="Browse listings, projects, and insights from across New Zealand."
            align="start"
            className="mb-10"
          />
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {topCities.map((city, i) => {
            // Resolve the main-centre name to region/district. The count and the
            // link both key off the resolved place so they always agree.
            const place = resolvePlace(city.name);
            const countKey = (
              place.district ??
              place.region ??
              city.name
            ).toLowerCase();
            const count = counts[countKey] ?? 0;

            const params = new URLSearchParams();
            if (place.region) params.set("region", place.region);
            if (place.district) params.set("district", place.district);
            if (!place.region) params.set("q", city.name);
            const href = `/properties?${params.toString()}`;

            return (
              <Reveal key={city.name} delay={i * 60}>
                <Link
                  href={href}
                  className="group shadow-soft relative block aspect-4/3 overflow-hidden rounded-2xl"
                >
                  <Image
                    src={city.image}
                    alt={`Properties in ${city.name}`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Navy wash for legible white text in either theme. */}
                  <span
                    aria-hidden
                    className="from-brand/90 via-brand/25 absolute inset-0 bg-linear-to-t to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 text-white">
                    <div className="flex flex-col">
                      <span className="text-base font-semibold tracking-tight sm:text-lg">
                        {city.name}
                      </span>
                      <span className="text-xs text-white/80">
                        {count.toLocaleString()}{" "}
                        {count === 1 ? "property" : "properties"}
                      </span>
                    </div>
                    <ArrowRight className="size-5 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
