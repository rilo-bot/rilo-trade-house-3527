import { env } from "@/lib/env";
import { LeadStatus, ListingStatus, UserRole } from "@/lib/enums";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import { sendLeadEmail } from "@/lib/email";
import type { CurrentUser } from "@/lib/auth/guards";
import { findListingById } from "@/features/listings/listings.repository";
import {
  findLeadById,
  findLeadsByOwner,
  findLeadsBySeeker,
  getOwnerContact,
  insertLead,
  updateLeadStatus,
  type Lead,
} from "./leads.repository";
import type { CreateLeadInput } from "./leads.schema";

/**
 * Business logic for leads. Guests may create leads (no session); `seeker` is
 * the current user when signed in. Throws AppError subclasses for the controller.
 */
export async function createLead(
  input: CreateLeadInput,
  seeker: CurrentUser | null,
): Promise<Lead> {
  const listing = await findListingById(input.listingId);
  if (!listing || listing.status !== ListingStatus.Active) {
    throw new NotFoundError("Listing not found");
  }
  if (seeker && seeker.id === listing.ownerId) {
    throw new BadRequestError("You can't enquire on your own listing");
  }

  const lead = await insertLead({
    listingId: listing.id,
    ownerId: listing.ownerId,
    seekerId: seeker?.id ?? null,
    name: input.name,
    phone: input.phone,
    email: input.email || undefined,
    message: input.message || undefined,
    kind: input.kind,
    preferredTime: input.preferredTime || undefined,
    listingTitle: listing.title,
    listingLocality: listing.location.locality,
    listingCity: listing.location.city,
  });

  // Notify the owner — best-effort, never blocks the enquiry.
  try {
    const owner = await getOwnerContact(listing.ownerId);
    if (owner) {
      await sendLeadEmail({
        to: owner.email,
        ownerName: owner.name,
        listingTitle: listing.title,
        listingUrl: `${env.NEXT_PUBLIC_APP_URL}/properties/${listing.id}`,
        seekerName: input.name,
        phone: input.phone,
        email: input.email || undefined,
        message: input.message || undefined,
        kind: input.kind,
        preferredTime: input.preferredTime || undefined,
      });
    }
  } catch (err) {
    console.error("[createLead] notification email failed:", err);
  }

  return lead;
}

export async function listOwnerLeads(user: CurrentUser): Promise<Lead[]> {
  return findLeadsByOwner(user.id);
}

export async function listSeekerLeads(user: CurrentUser): Promise<Lead[]> {
  return findLeadsBySeeker(user.id);
}

export async function changeLeadStatus(
  user: CurrentUser,
  id: string,
  status: LeadStatus,
): Promise<Lead> {
  const lead = await findLeadById(id);
  if (!lead) throw new NotFoundError("Lead not found");
  if (lead.ownerId !== user.id && user.role !== UserRole.Admin) {
    throw new ForbiddenError("You can only manage leads on your own listings");
  }
  const updated = await updateLeadStatus(id, status);
  if (!updated) throw new NotFoundError("Lead not found");
  return updated;
}
