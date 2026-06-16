/**
 * Service layer — pure business logic, no HTTP concerns.
 *
 * Services don't know about `Request`/`Response`; they take plain inputs and
 * return plain data or throw `AppError`s. This keeps them unit-testable and
 * reusable from route handlers, Server Actions, or other services.
 */

export interface HealthStatus {
  status: "ok";
  uptimeSeconds: number;
  timestamp: string;
}

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
