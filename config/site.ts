/**
 * Central place for app-wide static config: name, description, nav links,
 * external URLs. Import from here instead of hard-coding strings in components.
 */

/** Icon keys for nav menu items — mapped to lucide icons in the header. */
export type NavIcon =
  | "home"
  | "building"
  | "heart"
  | "key"
  | "users"
  | "book"
  | "listPlus"
  | "route"
  | "shield"
  | "insights"
  | "trending"
  | "bell"
  | "gavel";

/** A single entry inside a nav dropdown (mega-menu row). */
export type NavMenuItem = {
  title: string;
  href: string;
  description: string;
  icon: NavIcon;
  /** Roadmap item — shown greyed-out with a "Soon" tag, not clickable. */
  soon?: boolean;
};

/**
 * A top-level header nav item. Usually a labelled trigger that opens a dropdown
 * (`items`). When `href` is set instead, it renders as a single direct link —
 * and `live` adds a pulsing red "live now" dot beside the label.
 */
export type NavMenu = {
  title: string;
  /** Direct-link destination. When set, the item is a plain link, not a menu. */
  href?: string;
  /** Show a pulsing red "live" dot next to the label (direct links only). */
  live?: boolean;
  items?: NavMenuItem[];
};

// Primary navigation — four intent-based menus (Buy / Rent / Sell / Research),
// each opening into a grouped dropdown. Consumed by the site header.
const nav: NavMenu[] = [
  {
    title: "Buy",
    items: [
      {
        title: "Houses for sale",
        href: "/buy",
        icon: "home",
        description: "Browse homes for sale across New Zealand",
      },
      {
        title: "All properties",
        href: "/properties",
        icon: "building",
        description: "Every active listing in one view",
      },
      {
        title: "Saved homes",
        href: "/wishlist",
        icon: "heart",
        description: "Listings you've shortlisted",
      },
      {
        title: "Saved searches",
        href: "/saved-searches",
        icon: "bell",
        description: "Get alerts when new homes match",
      },
    ],
  },
  {
    title: "Live auctions",
    href: "/auctions",
    live: true,
  },
  {
    title: "Rent",
    items: [
      {
        title: "Homes to rent",
        href: "/rent",
        icon: "key",
        description: "Find your next rental",
      },
      {
        title: "Find flatmates",
        href: "/flatmates",
        icon: "users",
        description: "Rooms and flatshares",
      },
      {
        title: "Renting guides",
        href: "/rent/guides",
        icon: "book",
        description: "Tips and checklists for tenants",
      },
    ],
  },
  {
    title: "Sell",
    items: [
      {
        title: "List your property",
        href: "/post-property",
        icon: "listPlus",
        description: "Create a listing in minutes",
      },
      {
        title: "How it works",
        href: "/#how-it-works",
        icon: "route",
        description: "From listing to sold, explained",
      },
      {
        title: "Why Trade House",
        href: "/#why",
        icon: "shield",
        description: "What sets our marketplace apart",
      },
    ],
  },
  {
    title: "Research",
    items: [
      {
        title: "Suburb insights",
        href: "/insights",
        icon: "insights",
        description: "Prices, trends and demand by suburb",
      },
      // Hidden until national price-movement data is available.
      // {
      //   title: "Market trends",
      //   href: "#",
      //   icon: "trending",
      //   description: "National price movements",
      //   soon: true,
      // },
      {
        title: "Buying & renting guides",
        href: "/guides",
        icon: "book",
        description: "Guides for every step of the journey",
      },
    ],
  },
];

export const siteConfig = {
  name: "Trade House",
  description:
    "New Zealand's trusted real estate marketplace. Find verified homes to buy, rent, or invest in.",
  nav,
  // Footer link columns.
  footerNav: [
    {
      title: "Company",
      links: [
        { title: "About", href: "#" },
        { title: "Careers", href: "#" },
        { title: "Contact", href: "#" },
      ],
    },
    {
      title: "Explore",
      links: [
        { title: "Buy", href: "/buy" },
        { title: "Rent", href: "/rent" },
        { title: "Suburb insights", href: "/insights" },
      ],
    },
    {
      title: "Support",
      links: [
        { title: "Help center", href: "#" },
        { title: "Privacy", href: "#" },
        { title: "Terms", href: "#" },
      ],
    },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
