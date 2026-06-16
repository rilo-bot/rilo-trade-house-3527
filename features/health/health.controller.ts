import { ok } from "@/lib/api/response";
import { getHealthStatus } from "./health.service";

/**
 * Controller layer — the bridge between HTTP and the service layer.
 *
 * A controller: (1) reads/validates input from the request (params, query,
 * body via a Zod schema), (2) calls one or more services, (3) maps the result
 * to an HTTP response envelope. It does NOT contain business logic itself.
 *
 * Errors are thrown, not returned — `withErrorHandling` in the route formats
 * them. This controller takes no input, so it has no validation step.
 */
export async function handleGetHealth(): Promise<Response> {
  const status = getHealthStatus();
  return ok(status);
}
