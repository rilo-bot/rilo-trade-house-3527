/**
 * Standard JSON response envelope for all route handlers.
 *
 * Every API response always carries BOTH fields — exactly one is non-null:
 *   success -> { data: <T>,  error: null }
 *   failure -> { data: null, error: { code, message, details? } }
 *
 * Clients can branch on `error` (truthy = failure) and read `data` directly
 * when it's null-checked. Use `ok()` / `created()` for success and let thrown
 * errors flow to the error-handling wrapper (`lib/api/handler.ts`) for
 * failures — controllers should rarely call `fail()` directly.
 */

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

/** 200 OK (or a custom 2xx status) with a typed data payload. */
export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data, error: null } satisfies ApiResponse<T>, {
    status,
  });
}

/** 201 Created — convenience wrapper around `ok`. */
export function created<T>(data: T): Response {
  return ok(data, 201);
}

/** 204 No Content. */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/** Error envelope. Prefer throwing an `AppError`; the wrapper calls this. */
export function fail(
  error: ApiError,
  status: number,
): Response {
  return Response.json({ data: null, error } satisfies ApiResponse<never>, {
    status,
  });
}
