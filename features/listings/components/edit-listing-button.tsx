"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Listing } from "@/features/listings/listings.repository";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ListingWizardDialog } from "@/features/listings/components/listing-wizard";

/**
 * Opens the listing wizard pre-filled (edit mode) for an existing listing.
 * Same stepper/dialog as creating — just a different mode + initial values.
 *
 * `className` lets callers restyle the trigger (e.g. as a pill overlaid on a
 * card image). The click is stopped from propagating so that, when this button
 * lives inside a card-level <Link>, opening the editor doesn't also navigate to
 * the listing.
 */
export function EditListingButton({
  listing,
  className,
}: {
  listing: Listing;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Edit listing"
        className={cn(className)}
      >
        <Pencil className="size-4" />
      </Button>
      <ListingWizardDialog
        open={open}
        onOpenChange={setOpen}
        mode="edit"
        listingId={listing.id}
        initial={listing}
      />
    </>
  );
}
