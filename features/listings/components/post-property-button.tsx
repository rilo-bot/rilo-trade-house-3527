"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingWizardDialog } from "@/features/listings/components/listing-wizard";

/**
 * "Post property" CTA — opens the listing wizard (create mode) in a modal.
 * Reusable as any button: pass variant/size/children.
 */
export function PostPropertyButton({
  children,
  variant,
  size,
  className,
}: {
  children?: ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children ?? (
          <>
            <Plus className="size-4" /> Post property
          </>
        )}
      </Button>
      <ListingWizardDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
