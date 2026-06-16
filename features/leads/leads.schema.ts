import { z } from "zod";
import { LeadKind, LeadStatus } from "@/lib/enums";
import { isValidNZMobile } from "@/lib/utils";

/**
 * Zod schemas for leads (enquiries). `createLeadSchema` validates the public
 * enquiry form — guests may submit (name + phone required); `seekerId` is set
 * server-side from the session, never accepted from the client.
 *
 * A lead is either a general enquiry or a viewing request (`kind`). Viewing
 * requests carry a `preferredTime` (an ISO date-time string — either a chosen
 * open-home slot or a time the seeker picked).
 */
export const createLeadSchema = z.object({
  listingId: z.string().min(1),
  name: z.string().min(2, "Enter your name").max(80),
  phone: z
    .string()
    .trim()
    .refine(isValidNZMobile, "Enter a valid NZ mobile number (e.g. 021 123 4567)"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  message: z.string().max(1000).optional(),
  kind: z.enum(LeadKind).default(LeadKind.Enquiry),
  preferredTime: z.string().min(1).max(40).optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(LeadStatus),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
