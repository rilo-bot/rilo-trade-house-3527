/**
 * Application error types.
 *
 * Throw these from services/controllers instead of returning ad-hoc error
 * responses. The API error-handling wrapper (`lib/api/handler.ts`) maps them to
 * the correct HTTP status and response envelope, so the HTTP shape lives in one
 * place and business logic stays transport-agnostic.
 */

export class AppError extends Error {
  /** HTTP status code to respond with. */
  readonly statusCode: number;
  /** Stable, machine-readable code for clients (e.g. "NOT_FOUND"). */
  readonly code: string;
  /** Optional structured context (never include secrets). */
  readonly details?: unknown;

  constructor(
    message: string,
    options: { statusCode?: number; code?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.details = options.details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, { statusCode: 400, code: "BAD_REQUEST", details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(message, { statusCode: 401, code: "UNAUTHORIZED", details });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: unknown) {
    super(message, { statusCode: 403, code: "FORBIDDEN", details });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: unknown) {
    super(message, { statusCode: 404, code: "NOT_FOUND", details });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", details?: unknown) {
    super(message, { statusCode: 409, code: "CONFLICT", details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests", details?: unknown) {
    super(message, { statusCode: 429, code: "RATE_LIMITED", details });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = "Service unavailable", details?: unknown) {
    super(message, { statusCode: 503, code: "SERVICE_UNAVAILABLE", details });
  }
}
