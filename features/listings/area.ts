import { AreaUnit } from "@/lib/enums";

/**
 * Area normalization helpers.
 *
 * Listings store floor/land area as `{ value, unit }` where `unit` may be m²,
 * hectares, ft², or yd². Filtering or sorting on the raw `value` is meaningless
 * across mixed units (a 2-hectare block stores `value: 2`, a 200 m² yard stores
 * `value: 200`). So on write we denormalize a canonical **square-metre** field
 * (`valueSqm`) next to the user-facing `value`+`unit`, and search queries/sorts
 * run against `valueSqm`. The display value/unit are kept untouched.
 */

/** Multiplier to convert a value in the given unit to square metres. */
const TO_SQM: Record<AreaUnit, number> = {
  [AreaUnit.Sqm]: 1,
  [AreaUnit.Hectare]: 10_000,
  [AreaUnit.Sqft]: 0.092903,
  [AreaUnit.Sqyd]: 0.836127,
};

/** Convert an area `value` in `unit` to square metres (rounded to 2dp). */
export function toSqm(value: number, unit: AreaUnit): number {
  const factor = TO_SQM[unit] ?? 1;
  return Math.round(value * factor * 100) / 100;
}

/**
 * Return a copy of an `{ value, unit }` area with a computed `valueSqm`. Used by
 * the write path so every stored area carries its canonical m² figure. Returns
 * `undefined` unchanged so optional areas stay optional.
 */
export function withSqm<T extends { value: number; unit: AreaUnit }>(
  area: T | undefined,
): (T & { valueSqm: number }) | undefined {
  if (!area) return undefined;
  return { ...area, valueSqm: toSqm(area.value, area.unit) };
}
