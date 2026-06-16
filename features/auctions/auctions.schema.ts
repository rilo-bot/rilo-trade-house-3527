import { z } from "zod";
import { BidMethod, RegistrationStatus } from "@/lib/enums";
import { isValidNZMobile } from "@/lib/utils";

/**
 * Zod schemas for auctions. `createRegistrationSchema` validates a "register to
 * bid" request — unlike a lead, registering requires a signed-in account (a
 * bidder identity is needed to bid), so `bidderId` is taken from the session,
 * never the client.
 */
export const createRegistrationSchema = z.object({
  listingId: z.string().min(1),
  name: z.string().min(2, "Enter your name").max(80),
  phone: z
    .string()
    .trim()
    .refine(isValidNZMobile, "Enter a valid NZ mobile number (e.g. 021 123 4567)"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  bidMethod: z.enum(BidMethod).default(BidMethod.Online),
});

export const updateRegistrationStatusSchema = z.object({
  status: z.enum(RegistrationStatus),
});

/**
 * A live bid. `amount` is validated for shape here (positive integer, sane
 * ceiling); whether it actually beats the current high + increment is checked
 * in the service against live DB state.
 */
export const placeBidSchema = z.object({
  amount: z.number().int().positive().max(1_000_000_000),
});

/** Set/clear a proxy ("auto-bid") ceiling. `maxAmount: null` cancels it. */
export const autoBidSchema = z.object({
  maxAmount: z.number().int().positive().max(1_000_000_000).nullable(),
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>;
export type UpdateRegistrationStatusInput = z.infer<
  typeof updateRegistrationStatusSchema
>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type AutoBidInput = z.infer<typeof autoBidSchema>;
