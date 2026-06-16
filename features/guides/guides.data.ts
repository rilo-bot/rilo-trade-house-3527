import {
  BadgeDollarSign,
  Banknote,
  Calculator,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileCheck,
  FileSignature,
  KeyRound,
  Landmark,
  PenLine,
  PiggyBank,
  Scale,
  ScrollText,
  Search,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Static, plain-language content for the guides pages:
 *   • Renting guides   → /rent/guides   (the `renting*` exports)
 *   • Buying & renting → /guides        (the `buying*` exports)
 *
 * Figures reflect well-established New Zealand rules (e.g. the four-week bond
 * cap, bonds lodged with Tenancy Services, the ~20% deposit lenders look for,
 * LIM/title due diligence). They're written as general guidance — not legal or
 * financial advice — and each page links to its authoritative source
 * (tenancy.govt.nz for renting, settled.govt.nz for buying). Keep that in mind
 * before changing any numbers.
 */

/** A step in a "how it works" journey strip. */
export type JourneyStep = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** One practical, encouraging pointer shown under the step. */
  tip: string;
};

/** A featured guide topic card with a few digestible bullet points. */
export type GuideTopic = {
  icon: LucideIcon;
  title: string;
  summary: string;
  points: readonly string[];
};

/** A headline fact surfaced in the "at a glance" strip. */
export type GuideFact = {
  icon: LucideIcon;
  stat: string;
  label: string;
  detail: string;
};

/** A practical, tickable checklist for a stage of the journey. */
export type Checklist = {
  icon: LucideIcon;
  title: string;
  description: string;
  items: readonly string[];
};

/** A question/answer pair for a guide FAQ accordion. */
export type GuideFaq = { q: string; a: string };

/* ────────────────────────────── Renting ────────────────────────────── */

export const rentingJourney: readonly JourneyStep[] = [
  {
    icon: Search,
    title: "Search & shortlist",
    description:
      "Set your budget, preferred suburbs and must-haves, then save searches so new rentals come straight to you.",
    tip: "Aim to keep rent around 30% of your income.",
  },
  {
    icon: CalendarCheck,
    title: "Book a viewing",
    description:
      "Message the owner or agent and line up a private viewing or open home — no middlemen in between.",
    tip: "Visit in daylight and bring a list of questions.",
  },
  {
    icon: ClipboardList,
    title: "Apply",
    description:
      "Send a complete application with your ID, references and proof of income ready to go.",
    tip: "A tidy, complete application gets read first.",
  },
  {
    icon: PenLine,
    title: "Sign & pay bond",
    description:
      "Read the tenancy agreement, then pay your bond and any rent in advance to secure the place.",
    tip: "Your bond is held by Tenancy Services, not the landlord.",
  },
  {
    icon: KeyRound,
    title: "Move in & settle",
    description:
      "Do a move-in inspection, take photos, set up your utilities and make it home.",
    tip: "Record the condition on day one to protect your bond.",
  },
] as const;

export const rentingTopics: readonly GuideTopic[] = [
  {
    icon: Eye,
    title: "Viewing a rental",
    summary: "What to look for before you fall in love with a place.",
    points: [
      "Run the taps for water pressure and hot water",
      "Look for damp, mould or musty smells",
      "Check heating, insulation and natural light",
      "Test phone and internet coverage",
      "Note storage, parking and outdoor space",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Applying for a rental",
    summary: "Stand out to landlords with a complete application.",
    points: [
      "Photo ID and proof of income",
      "Previous landlord and character references",
      "A short intro about who'll be living there",
      "Confirmation of employment or study",
      "Apply early — good rentals move fast",
    ],
  },
  {
    icon: ScrollText,
    title: "Your tenancy agreement",
    summary: "Know exactly what you're agreeing to before you sign.",
    points: [
      "Rent amount, due dates and how to pay",
      "Fixed-term versus periodic tenancy",
      "Who pays which bills and utilities",
      "Rules on pets, smoking and subletting",
      "Everyone living there should be named",
    ],
  },
  {
    icon: Wallet,
    title: "Bond & rent",
    summary: "How the money works so there are no surprises.",
    points: [
      "Bond is capped at four weeks' rent",
      "Bond is lodged with Tenancy Services",
      "No more than two weeks' rent in advance",
      "Tenants can't be charged a letting fee",
      "Always keep receipts and rent records",
    ],
  },
  {
    icon: Scale,
    title: "Rights & responsibilities",
    summary: "A fair tenancy goes both ways.",
    points: [
      "Landlords keep the home in good repair",
      "Rentals must meet Healthy Homes standards",
      "You're entitled to privacy and proper notice",
      "Pay rent on time and keep the place tidy",
      "Report maintenance issues promptly",
    ],
  },
  {
    icon: Truck,
    title: "Moving in & out",
    summary: "Simple habits that protect your bond.",
    points: [
      "Complete a written move-in inspection",
      "Photograph or film every room",
      "Report any existing damage in writing",
      "Leave the place as you found it",
      "Claim your bond back via Tenancy Services",
    ],
  },
] as const;

export const rentingFacts: readonly GuideFact[] = [
  {
    icon: Wallet,
    stat: "4 weeks",
    label: "Maximum bond",
    detail: "A landlord can ask for no more than four weeks' rent as bond.",
  },
  {
    icon: Landmark,
    stat: "Tenancy Services",
    label: "Holds your bond",
    detail: "Bonds are lodged with the government — not kept by the landlord.",
  },
  {
    icon: CalendarClock,
    stat: "Every 12 months",
    label: "Rent increase limit",
    detail: "Rent can rise at most once a year, with written notice in advance.",
  },
  {
    icon: BadgeDollarSign,
    stat: "$0",
    label: "Letting fees",
    detail: "Tenants can't be charged a letting fee to secure a rental.",
  },
] as const;

export const rentingChecklists: readonly Checklist[] = [
  {
    icon: Search,
    title: "At the viewing",
    description: "Take ten minutes to check the things photos won't show.",
    items: [
      "Turn on taps — water pressure and hot water",
      "Look for damp, mould or musty smells",
      "Test heating and ask about insulation",
      "Open windows and test the locks",
      "Check phone and internet coverage",
      "Confirm what's included (whiteware, curtains)",
      "See the neighbourhood at the right time of day",
    ],
  },
  {
    icon: FileCheck,
    title: "Application documents",
    description: "Have these saved and ready so you can apply on the spot.",
    items: [
      "Photo ID (driver licence or passport)",
      "Proof of income (payslips or bank statements)",
      "Employment or study confirmation",
      "Previous landlord reference",
      "Character reference",
      "Your rental history and past addresses",
    ],
  },
  {
    icon: KeyRound,
    title: "Moving in",
    description: "Day-one steps that keep your tenancy smooth.",
    items: [
      "Complete and sign the inspection report",
      "Photograph or film every room",
      "Note existing damage in writing",
      "Check your bond is lodged with Tenancy Services",
      "Set up power, gas and internet",
      "Find the water shut-off and meter box",
      "Test the smoke alarms",
    ],
  },
] as const;

export const rentingFaqs: readonly GuideFaq[] = [
  {
    q: "How much bond can a landlord ask for?",
    a: "No more than four weeks' rent. The bond is lodged with Tenancy Services — a government service that holds it until your tenancy ends — so your landlord doesn't keep it themselves.",
  },
  {
    q: "Do I have to pay a letting fee?",
    a: "No. Charging tenants a letting fee to secure a rental has been banned in New Zealand since December 2018.",
  },
  {
    q: "How often can my rent go up?",
    a: "At most once every 12 months, and your landlord must give you written notice in advance. Rent usually can't be increased during a fixed term unless the agreement specifically allows it.",
  },
  {
    q: "What's the difference between a fixed-term and periodic tenancy?",
    a: "A fixed-term runs for a set period (for example 12 months) and ends on an agreed date. A periodic tenancy continues until either party gives proper notice. The notice rules differ, so check which one you're signing.",
  },
  {
    q: "Can my landlord turn up whenever they like?",
    a: "No. You're entitled to quiet enjoyment of your home. Landlords must give proper notice and visit at reasonable times — generally at least 24 hours' notice for inspections and 48 hours before doing maintenance.",
  },
  {
    q: "What are the Healthy Homes Standards?",
    a: "Minimum standards every rental must meet for heating, insulation, ventilation, moisture and drainage, and draught stopping — designed to keep rentals warm, dry and healthy.",
  },
  {
    q: "How do I get my bond back?",
    a: "At the end of your tenancy you and your landlord agree on the refund and apply to Tenancy Services to release it. Leaving the place clean and undamaged — and having your move-in photos — makes this straightforward.",
  },
  {
    q: "What if there's a dispute with my landlord?",
    a: "Start by raising it with them in writing. If you can't resolve it, Tenancy Services offers free mediation, and the Tenancy Tribunal can make a binding decision.",
  },
] as const;

/* ────────────────────────────── Buying ─────────────────────────────── */

export const buyingJourney: readonly JourneyStep[] = [
  {
    icon: Calculator,
    title: "Work out your budget",
    description:
      "Figure out how much you can borrow and start saving your deposit so you know your price range.",
    tip: "Lenders often look for a deposit of around 20%.",
  },
  {
    icon: Banknote,
    title: "Get pre-approved",
    description:
      "Arrange finance pre-approval so you can move quickly and make offers with confidence.",
    tip: "Pre-approval shows sellers you're a serious buyer.",
  },
  {
    icon: Search,
    title: "Search & view",
    description:
      "Browse listings, attend open homes and shortlist the places that fit your brief.",
    tip: "Revisit your favourites at different times of day.",
  },
  {
    icon: ClipboardCheck,
    title: "Do your due diligence",
    description:
      "Check the LIM and title, and get a builder's report and valuation before you commit.",
    tip: "Never skip due diligence just to win a deal.",
  },
  {
    icon: KeyRound,
    title: "Offer & settle",
    description:
      "Negotiate, sign the agreement with your lawyer, then settle and collect the keys.",
    tip: "Engage a lawyer or conveyancer from the start.",
  },
] as const;

export const buyingTopics: readonly GuideTopic[] = [
  {
    icon: PiggyBank,
    title: "Saving your deposit",
    summary: "Build the deposit lenders want — and the extras people forget.",
    points: [
      "Aim for 20% to avoid low-equity costs",
      "Use your KiwiSaver first-home withdrawal",
      "Budget for legal, inspection and moving costs",
      "Keep a buffer for the unexpected",
      "Smaller-deposit lending may be an option",
    ],
  },
  {
    icon: Banknote,
    title: "Getting a mortgage",
    summary: "Line up the right loan before you start bidding.",
    points: [
      "Compare lenders, rates and fees",
      "Get your pre-approval in writing",
      "Understand fixed versus floating rates",
      "Consider using a mortgage adviser",
      "Factor repayments into your budget",
    ],
  },
  {
    icon: Search,
    title: "Researching a property",
    summary: "Look past the listing photos before you fall in love.",
    points: [
      "Read the LIM report from the council",
      "Check the record of title",
      "Look into flood, erosion and hazard info",
      "Review recent comparable sales",
      "Check school zones and amenities",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Inspections & reports",
    summary: "Find the problems an open home won't show you.",
    points: [
      "Get a builder's or building report",
      "Watch for weathertightness issues",
      "Review body corporate records for apartments",
      "Consider a meth test if you're unsure",
      "Ask about any known defects",
    ],
  },
  {
    icon: FileSignature,
    title: "Making an offer",
    summary: "Know your options and protect yourself.",
    points: [
      "Auction, tender, deadline sale or negotiation",
      "Conditional versus unconditional offers",
      "Common conditions: finance, LIM, builder's report",
      "Deposit is usually around 10%",
      "Your lawyer checks it before you sign",
    ],
  },
  {
    icon: KeyRound,
    title: "Settlement & moving in",
    summary: "The final steps to getting the keys.",
    points: [
      "Your lawyer handles settlement",
      "Do a final pre-settlement inspection",
      "Arrange insurance from settlement day",
      "Transfer power, gas and internet",
      "Collect the keys and move in",
    ],
  },
] as const;

export const buyingFacts: readonly GuideFact[] = [
  {
    icon: Wallet,
    stat: "~20%",
    label: "Typical deposit",
    detail: "Many lenders prefer a 20% deposit, though lower-deposit lending is available.",
  },
  {
    icon: PiggyBank,
    stat: "KiwiSaver",
    label: "First-home help",
    detail: "Eligible first-home buyers can withdraw KiwiSaver savings toward a deposit.",
  },
  {
    icon: ClipboardCheck,
    stat: "LIM & title",
    label: "Do your homework",
    detail: "Always review the LIM report and record of title before you buy.",
  },
  {
    icon: Scale,
    stat: "Your lawyer",
    label: "Before you sign",
    detail: "A lawyer or conveyancer should check the agreement before you commit.",
  },
] as const;

export const buyingChecklists: readonly Checklist[] = [
  {
    icon: Calculator,
    title: "Before you start",
    description: "Get your finances and search criteria in order.",
    items: [
      "Check your savings and credit",
      "Get finance pre-approval",
      "Decide your must-haves and areas",
      "Understand deposit and LVR rules",
      "Budget for legal, inspection and moving costs",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Before you offer",
    description: "The due diligence every buyer should do.",
    items: [
      "Read the LIM report",
      "Check the record of title",
      "Get a builder's or building report",
      "Have your lawyer review the agreement",
      "Confirm your finance is in place",
      "Research comparable sales",
    ],
  },
  {
    icon: KeyRound,
    title: "Before settlement",
    description: "Tie up the loose ends before the keys are yours.",
    items: [
      "Do a final pre-settlement inspection",
      "Arrange house insurance from settlement",
      "Transfer power, gas and internet",
      "Confirm funds with your lawyer",
      "Organise your moving day",
      "Collect the keys",
    ],
  },
] as const;

export const buyingFaqs: readonly GuideFaq[] = [
  {
    q: "How big a deposit do I need?",
    a: "Many lenders prefer a deposit of around 20%, but lower-deposit lending is available for some buyers. The more you put down, the more options and the better the rates you'll typically get.",
  },
  {
    q: "Can I use my KiwiSaver to buy a first home?",
    a: "Yes — if you're eligible you can withdraw most of your KiwiSaver savings to put toward a first home. Check the current rules and your eligibility with your KiwiSaver provider.",
  },
  {
    q: "What is a LIM report?",
    a: "A Land Information Memorandum is a council report summarising what they know about a property — building consents, drainage, hazards, rates and more. It's a key due-diligence document before you buy.",
  },
  {
    q: "What's the difference between conditional and unconditional offers?",
    a: "A conditional offer depends on conditions being met (such as finance or a builder's report); an unconditional offer has no conditions and is binding once accepted. Don't go unconditional until your checks are complete.",
  },
  {
    q: "Do I need a lawyer to buy a house?",
    a: "Yes. A lawyer or conveyancer reviews the sale and purchase agreement, checks the title, and handles settlement. Engage one before you sign anything.",
  },
  {
    q: "What's the difference between auction, tender and negotiation?",
    a: "At an auction you bid in real time and a winning bid is usually unconditional. A tender means submitting a confidential written offer by a deadline. By negotiation you make an offer — often conditional — and negotiate the terms. Each needs a different level of preparation.",
  },
  {
    q: "Should I get a building inspection?",
    a: "Almost always. A builder's or building report flags structural, weathertightness and maintenance issues you can't see at an open home — well worth the cost before you commit.",
  },
  {
    q: "What happens on settlement day?",
    a: "Your lawyer transfers the balance of the purchase price, ownership passes to you, and you collect the keys. Do a final pre-settlement inspection beforehand to confirm the property is as agreed.",
  },
] as const;
