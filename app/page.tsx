import { Suspense } from "react";
import { Hero } from "@/components/common/hero";
import { Reveal } from "@/components/common/reveal";
import { HeroSearch } from "@/features/marketing/components/hero-search";
import { FeaturedListings } from "@/features/listings/components/featured-listings";
import { QuickActions } from "@/features/marketing/components/quick-actions";
import { TopCities } from "@/features/marketing/components/top-cities";
import {
  BrowseByTypeSkeleton,
  QuickActionsSkeleton,
  TopCitiesSkeleton,
} from "@/features/marketing/components/marketing-skeletons";
import { HowItWorks } from "@/features/marketing/components/how-it-works";
import { TrustStrip } from "@/features/marketing/components/trust-strip";
import { ListCta } from "@/features/marketing/components/list-cta";
import { BrowseByType } from "@/features/marketing/components/browse-by-type";
import { BrowseByBudget } from "@/features/marketing/components/browse-by-budget";
import { InsightsTeaser } from "@/features/marketing/components/insights-teaser";
import { Faq } from "@/features/marketing/components/faq";
import { HomeSearchStoreProvider } from "@/stores/home-search-store-provider";

export default function Home() {
  return (
    <HomeSearchStoreProvider>
      <Hero
        imageSrc="https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1920&q=75"
        imageAlt="Luxury modern home with a pool at dusk"
        contentClassName="max-w-4xl"
        // Full-screen hero pulled up behind the transparent sticky header.
        // Pull up 1px MORE than the 3.5rem header row: exact cancellation can
        // leave a 1px hairline at the top edge under fractional display scaling,
        // so the dark hero deliberately overlaps an extra pixel to cover it.
        className="-mt-[calc(3.5rem+1px)] min-h-svh"
        // To use a self-hosted background video instead, drop the file in
        // public/videos/hero.mp4 and add: videoSrc="/videos/hero.mp4"
      >
        <Reveal className="w-full" delay={80}>
          <h1 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Find your next home in{" "}
            <span className="from-sky-300 to-blue-400 bg-linear-to-r bg-clip-text text-transparent">
              New Zealand
            </span>
          </h1>
        </Reveal>
        <Reveal className="w-full" delay={150}>
          <p className="text-brand-foreground/80 mx-auto max-w-xl text-lg text-pretty">
            The premium property marketplace. Discover verified homes to buy,
            rent, or share, all in one place.
          </p>
        </Reveal>
        <Reveal className="mt-2 w-full" delay={220}>
          <HeroSearch />
        </Reveal>
      </Hero>

      {/* Async (DB-backed) sections are wrapped in <Suspense> with a matching
          skeleton, so the page shell paints immediately and each section
          streams in — no full-page spinner. */}
      {/* "Everything you need, in one place" */}
      <Suspense fallback={<QuickActionsSkeleton />}>
        <QuickActions />
      </Suspense>
      {/* Browse by property type — quick entry points with live counts. */}
      <Suspense fallback={<BrowseByTypeSkeleton />}>
        <BrowseByType />
      </Suspense>
      {/* Featured properties — the hero search scrolls here and shows matches
          in place (client fetch with its own skeleton). */}
      <div id="listings">
        <FeaturedListings />
      </div>
      {/* Browse by budget — price-range quick filters (tinted band). */}
      <BrowseByBudget />
      {/* "Explore real estate in top cities" */}
      <Suspense fallback={<TopCitiesSkeleton />}>
        <TopCities />
      </Suspense>
      {/* "How it works" — editorial collage + steps (Sell menu anchors here
          via the section's own id="how-it-works"). */}
      <HowItWorks />
      {/* Suburb-insights cross-sell band. */}
      <InsightsTeaser />
      {/* "Why Trade House" — trust/social proof (Sell menu anchors here) */}
      <div id="why">
        <TrustStrip />
      </div>
      {/* Frequently asked questions. */}
      <Faq />
      <ListCta />
    </HomeSearchStoreProvider>
  );
}
