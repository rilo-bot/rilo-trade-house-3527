import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { fail } from "@/lib/api/response";

/**
 * Wraps a route handler so every thrown error becomes a consistent JSON error
 * envelope. Wrap each exported HTTP method in `route.ts`:
 *
 *   export const GET = withErrorHandling(handleGetThing);
 *
 * - `ZodError`  -> 422 VALIDATION_ERROR (with flattened field errors)
 * - `AppError`  -> its own statusCode/code/details
 * - anything else -> 500 INTERNAL_ERROR (logged, message not leaked)
 *
 * `Args` is variadic so this works for both `route.ts` handlers (which receive
 * `(request, context)`) and zero-arg controllers alike.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Response | Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return fail(
          {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: err.flatten(),
          },
          422,
        );
      }

      if (err instanceof AppError) {
        return fail(
          { code: err.code, message: err.message, details: err.details },
          err.statusCode,
        );
      }

      console.error("Unhandled route error:", err);
      return fail(
        { code: "INTERNAL_ERROR", message: "Something went wrong" },
        500,
      );
    }
  };
}
