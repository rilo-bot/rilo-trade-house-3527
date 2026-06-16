import { z } from "zod";

/**
 * Zod schemas for the favorites (wishlist) feature. A favorite is just a
 * (user, listing) pair; the only client input is the listing id to save.
 */

/** Body accepted by POST /api/favorites. */
export const addFavoriteSchema = z.object({
  listingId: z.string().min(1, "listingId is required"),
});

export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
