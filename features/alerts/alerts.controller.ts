import { created } from "@/lib/api/response";
import { subscribeAlertSchema } from "./alerts.schema";
import { subscribeToAlerts } from "./alerts.service";

/** POST /api/alerts — subscribe an email to new-listing alerts. */
export async function handleSubscribeAlerts(
  request: Request,
): Promise<Response> {
  const input = subscribeAlertSchema.parse(await request.json());
  const { created: isNew } = await subscribeToAlerts(input);
  return created({ subscribed: true, alreadySubscribed: !isNew });
}
