/**
 * App-wide constants. Single source of truth for magic values so they aren't
 * duplicated across the codebase. Group related constants with `as const` to
 * get literal types and prevent accidental mutation.
 *
 * Note: dynamic/secret config belongs in `lib/env.ts`; static text and nav in
 * `config/site.ts`. This file is for shared literals used in logic.
 */

/** Numeric HTTP status codes, for readability over magic numbers. */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/** Internal route paths — reference these instead of hard-coding strings. */
export const ROUTES = {
  home: "/",
} as const;

/** Default pagination settings for list endpoints. */
export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 20,
  maxPageSize: 100,
} as const;
