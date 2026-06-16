import { z } from "zod";

/** Payload for subscribing to new-listing email alerts. */
export const subscribeAlertSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
  /** Optional intent filter ("sale" | "rent" | "pg"). */
  listingType: z.string().trim().min(1).optional(),
  /** Optional region focus (e.g. "Auckland"). */
  region: z.string().trim().min(1).optional(),
});

export type SubscribeAlertInput = z.infer<typeof subscribeAlertSchema>;
