/**
 * Global, cross-feature shared types.
 *
 * Feature-specific types live in that feature's folder (e.g.
 * `features/<feature>/types.ts`). Only put types here when 2+ unrelated
 * features need them.
 */

/** A value that may not be present. */
export type Maybe<T> = T | null | undefined;

/** Makes the listed keys of `T` optional. */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
