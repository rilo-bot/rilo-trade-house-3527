/** A property listing. Replace with the DB model once listings are persisted. */
export type Property = {
  id: string;
  title: string;
  city: string;
  locality: string;
  /** Pre-formatted price for display, e.g. "$1.85M" or "$1,850/wk". */
  priceLabel: string;
  beds: number;
  baths: number;
  /** Car spaces (off-street parking + garaging). */
  carSpaces?: number;
  /** Floor area in square metres (NZ standard). */
  areaSqm: number;
  /** Land/section area in square metres (omit for apartments/units). */
  landAreaSqm?: number;
  imageUrl: string;
  imageAlt: string;
  /** Optional corner tag, e.g. "Premium", "New", "Trending". */
  badge?: string;
};
