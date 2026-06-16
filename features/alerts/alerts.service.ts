import { saveAlertSubscription } from "./alerts.repository";
import type { SubscribeAlertInput } from "./alerts.schema";

/**
 * Subscribe an email to new-listing alerts. Idempotent per email + filters.
 * (Sending the actual alert emails is a separate background job — this just
 * captures the subscription.)
 */
export async function subscribeToAlerts(
  input: SubscribeAlertInput,
): Promise<{ created: boolean }> {
  return saveAlertSubscription(input);
}
