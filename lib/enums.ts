/**
 * App-wide enums (single source of truth for fixed value sets).
 *
 * Enum *values* are the exact strings persisted in MongoDB and passed around in
 * URLs / APIs — never change a value without a data migration. Add new domain
 * enums here as features land (e.g. ListingType, ListingStatus in Phase 2).
 */

/** A user's single global role in the marketplace. */
export enum UserRole {
  Seeker = "seeker",
  Owner = "owner",
  Agent = "agent",
  Admin = "admin",
}

/** Account lifecycle state. */
export enum UserStatus {
  Active = "active",
  Suspended = "suspended",
}

/** Which auth journey the OTP screen is completing. */
export enum AuthFlow {
  SignUp = "signup",
  SignIn = "signin",
}

/* ── Property listings ─────────────────────────────────────────────────── */

/** Top-level intent of a listing. */
export enum ListingType {
  Sale = "sale",
  Rent = "rent",
  Pg = "pg",
}

/** For sale listings: construction/ownership stage. */
export enum SaleType {
  Ready = "ready",
  UnderConstruction = "under_construction",
  Resale = "resale",
}

/**
 * How a for-sale property is marketed/priced (NZ convention). Determines which
 * extra fields apply: AUCTION needs an auction date, TENDER/DEADLINE need a
 * closing date, ENQUIRIES_OVER uses `price.amount` as a floor, PRICE_WITHHELD
 * shows no figure.
 */
export enum SaleMethod {
  AskingPrice = "asking_price",
  Negotiation = "negotiation",
  EnquiriesOver = "enquiries_over",
  Auction = "auction",
  Tender = "tender",
  DeadlineSale = "deadline_sale",
  PriceWithheld = "price_withheld",
}

/** NZ land/ownership title type. */
export enum TitleType {
  Freehold = "freehold",
  Leasehold = "leasehold",
  CrossLease = "cross_lease",
  UnitTitle = "unit_title",
}

/** Broad category that determines which fields apply. */
export enum PropertyCategory {
  Residential = "residential",
  Commercial = "commercial",
  Land = "land",
}

/** Concrete property type. */
export enum PropertyType {
  House = "house",
  Apartment = "apartment",
  Townhouse = "townhouse",
  Unit = "unit",
  Villa = "villa",
  Studio = "studio",
  Section = "section",
  Lifestyle = "lifestyle",
  Plot = "plot",
  Office = "office",
  Shop = "shop",
  PgBed = "pg_bed",
}

/** Furnishing level. */
export enum Furnishing {
  Unfurnished = "unfurnished",
  SemiFurnished = "semi_furnished",
  Furnished = "furnished",
}

/** PG / co-living gender policy. */
export enum PgGender {
  Boys = "boys",
  Girls = "girls",
  CoLiving = "coliving",
}

/** Whether `price.amount` is a one-time total or a monthly figure. */
export enum PriceType {
  Total = "total",
  Monthly = "monthly",
}

/** Area unit of measure. */
export enum AreaUnit {
  Sqm = "sqm",
  Hectare = "hectare",
  Sqft = "sqft",
  Sqyd = "sqyd",
}

/** Listing lifecycle. ACTIVE = publicly visible. */
export enum ListingStatus {
  Draft = "draft",
  PendingReview = "pending_review",
  Active = "active",
  RentedSold = "rented_sold",
  Expired = "expired",
  Rejected = "rejected",
}

/* ── Leads / enquiries ─────────────────────────────────────────────────── */

/** Whether a lead is a general enquiry or a request to view the property. */
export enum LeadKind {
  Enquiry = "enquiry",
  Viewing = "viewing",
}

/** Lifecycle of an enquiry from a seeker to an owner/agent. */
export enum LeadStatus {
  New = "new",
  Contacted = "contacted",
  ClosedWon = "closed_won",
  ClosedLost = "closed_lost",
}

/* ── Auctions ──────────────────────────────────────────────────────────── */

/** How a registered bidder intends to participate in an auction. */
export enum BidMethod {
  Online = "online",
  Phone = "phone",
  InRoom = "in_room",
}

/** Lifecycle of a "register to bid" request (owner/agent approves bidders). */
export enum RegistrationStatus {
  Pending = "pending",
  Approved = "approved",
  Declined = "declined",
}
