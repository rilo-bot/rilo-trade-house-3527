import {
  Bed,
  Building,
  Building2,
  CalendarCheck,
  Home,
  KeyRound,
  Search,
  ShieldCheck,
  Star,
  Tractor,
  Trees,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { PropertyType } from "@/lib/enums";

/** Quick-action tiles in the "Everything you need" section. */
export type QuickAction = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  /** Tile background photo (Unsplash, whitelisted in next.config.ts). */
  image: string;
  /** Descriptive alt text for the tile photo. */
  imageAlt: string;
};

/** Unsplash photo for an action tile, sized for the largest (featured) tile. */
const actionPhoto = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=70`;

export const quickActions: readonly QuickAction[] = [
  {
    icon: Home,
    title: "Buy a home",
    description:
      "Find, finance, and own your dream home with verified listings across New Zealand.",
    href: "/buy",
    image: actionPhoto("1568605114967-8130f3a36994"),
    imageAlt: "Modern New Zealand home exterior at dusk",
  },
  {
    icon: KeyRound,
    title: "Rent a home",
    description: "Move into your perfect rental, faster.",
    href: "/rent",
    image: actionPhoto("1502672260266-1c1ef2d93688"),
    imageAlt: "Bright, furnished rental living room",
  },
  {
    icon: Building2,
    title: "Flatmates",
    description: "Find a room or the right flatmate.",
    href: "/flatmates",
    image: actionPhoto("1522708323590-d24dbb6b0267"),
    imageAlt: "Cosy shared flat living space",
  },
  {
    icon: TrendingUp,
    title: "Sell or rent out",
    description: "List your property in minutes - for free.",
    href: "/post-property",
    image: actionPhoto("1560518883-ce09059eeffa"),
    imageAlt: "Property owner holding a sign outside a home",
  },
] as const;

/**
 * Headline stats for the social-proof band under the hero. Curated marketing
 * figures (not live data) — surfaced high on the page to build trust early.
 */
export type Stat = {
  value: string;
  label: string;
};

export const stats: readonly Stat[] = [
  { value: "12,000+", label: "Active listings" },
  { value: "200,000+", label: "Home seekers" },
  { value: "100%", label: "Verified properties" },
  { value: "4.8 / 5", label: "Average rating" },
] as const;

/** "How it works" — the three-step product flow for first-time visitors. */
export type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const howItWorks: readonly Step[] = [
  {
    icon: Search,
    title: "Search verified listings",
    description:
      "Browse genuine homes across New Zealand and filter by location, price, and features.",
  },
  {
    icon: CalendarCheck,
    title: "Connect & book a viewing",
    description:
      "Message the owner or agent directly and line up a tour or open-home slot - no middlemen.",
  },
  {
    icon: KeyRound,
    title: "Get the keys",
    description:
      "Make your offer, finalise the deal, and move into your new home.",
  },
] as const;

/**
 * Cities for the "Explore top cities" section. Names + cover photos are
 * curated; the listing counts and links are derived from real data in the
 * component (see top-cities.tsx) rather than hardcoded. Photos are Unsplash
 * (whitelisted in next.config.ts).
 */
export type City = {
  name: string;
  image: string;
};

const cityPhoto = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=70`;

export const topCities: readonly City[] = [
  // Photo IDs verified to depict each city's recognisable view/landmark.
  { name: "Auckland", image: cityPhoto("1747735577782-298d214af27d") }, // Sky Tower + harbour
  { name: "Wellington", image: cityPhoto("1624589010805-b4e69450ed87") }, // harbour + green hills
  { name: "Christchurch", image: cityPhoto("1697946979155-fd4e94f81c90") }, // punting on the Avon
  { name: "Hamilton", image: cityPhoto("1698278967237-2e812c4d8368") }, // Waikato River + Fairfield Bridge
  { name: "Tauranga", image: cityPhoto("1588027216464-a3225f923383") }, // Mount Maunganui (Mauao)
  { name: "Dunedin", image: cityPhoto("1589445370687-391ca5db6e9e") }, // Dunedin Railway Station
  { name: "Queenstown", image: cityPhoto("1547314283-befb6cc5cf29") }, // Lake Wakatipu + town
  { name: "Napier", image: cityPhoto("1707077730463-4faeee42f313") }, // Art Deco (Daily Telegraph)
] as const;

/** Trust strip items. */
export type TrustItem = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const trustItems: readonly TrustItem[] = [
  {
    icon: ShieldCheck,
    title: "Verified listings",
    description: "Every property is identity-verified for your peace of mind.",
  },
  {
    icon: TrendingUp,
    title: "Market insights",
    description: "Real-time price trends, locality scores, and forecasts.",
  },
  {
    icon: Star,
    title: "4.8 / 5 rated",
    description: "Trusted by 200,000+ happy home buyers across New Zealand.",
  },
] as const;

/**
 * Property-type tiles for the home "Browse by property type" section. The
 * `type` value is passed as `?propertyType=` to the browse pages; live counts
 * are fetched in the component (browse-by-type.tsx).
 */
export type PropertyTypeTile = {
  type: PropertyType;
  label: string;
  icon: LucideIcon;
};

export const propertyTypeTiles: readonly PropertyTypeTile[] = [
  { type: PropertyType.House, label: "Houses", icon: Home },
  { type: PropertyType.Apartment, label: "Apartments", icon: Building2 },
  { type: PropertyType.Townhouse, label: "Townhouses", icon: Building },
  { type: PropertyType.Section, label: "Sections & land", icon: Trees },
  { type: PropertyType.Lifestyle, label: "Lifestyle", icon: Tractor },
  { type: PropertyType.Studio, label: "Studios", icon: Bed },
] as const;

/** Budget quick-filter chips for the home "Browse by budget" section. */
export type BudgetRange = { label: string; href: string };

export const buyBudgets: readonly BudgetRange[] = [
  { label: "Under $600k", href: "/buy?maxPrice=600000" },
  { label: "$600k – $900k", href: "/buy?minPrice=600000&maxPrice=900000" },
  { label: "$900k – $1.2m", href: "/buy?minPrice=900000&maxPrice=1200000" },
  { label: "$1.2m+", href: "/buy?minPrice=1200000" },
] as const;

export const rentBudgets: readonly BudgetRange[] = [
  { label: "Under $500 / wk", href: "/rent?maxPrice=500" },
  { label: "$500 – $700 / wk", href: "/rent?minPrice=500&maxPrice=700" },
  { label: "$700 – $1,000 / wk", href: "/rent?minPrice=700&maxPrice=1000" },
  { label: "$1,000+ / wk", href: "/rent?minPrice=1000" },
] as const;

/** Common questions for the home FAQ accordion. */
export type Faq = { q: string; a: string };

export const faqs: readonly Faq[] = [
  {
    q: "Is Trade House free to use?",
    a: "Yes. Browsing, saving and enquiring about properties is completely free for home seekers — and listing your own property to sell or rent is free too.",
  },
  {
    q: "How do I contact a seller or agent?",
    a: "Open any listing and use “Request a viewing” or message the owner or agent directly through the platform. There are no middlemen between you and the property.",
  },
  {
    q: "Are the listings verified?",
    a: "Every listing goes through identity verification before it goes live, so you can browse and enquire with confidence.",
  },
  {
    q: "Can I sell or rent out my own property?",
    a: "Absolutely. Create a free account, choose “Sell”, and publish your listing in a few minutes — then manage enquiries from your dashboard.",
  },
  {
    q: "How do I save properties I like?",
    a: "Tap the heart on any listing to add it to your wishlist. Sign in and your saved homes stay with you across every device.",
  },
  {
    q: "Does Trade House cover all of New Zealand?",
    a: "Yes - from Auckland, Wellington and Christchurch to Queenstown, Tauranga and beyond. Use the search and filters to focus on your area.",
  },
] as const;
