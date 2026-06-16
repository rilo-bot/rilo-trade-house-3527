"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { UserRole } from "@/lib/enums";
import { completeSignupProfile } from "@/features/auth/auth.actions";
import { PostPropertyButton } from "@/features/listings/components/post-property-button";
import { Button } from "@/components/ui/button";

/**
 * Adaptive "Sell" CTA shown on the public /post-property landing page. Behaves
 * differently per visitor:
 *   - guest            → sign in (returns here afterwards)
 *   - seeker           → upgrade to an owner account, then post
 *   - owner/agent/admin→ open the listing wizard directly
 */
export function PostPropertyCta({ role }: { role: UserRole | null }) {
  const router = useRouter();
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Not signed in.
  if (role === null) {
    return (
      <Button asChild size="lg" className="h-12">
        <Link href="/auth/sign-in?redirect=/post-property">
          Sign in to post your property <ArrowRight className="size-4" />
        </Link>
      </Button>
    );
  }

  // Can already post.
  if (
    role === UserRole.Owner ||
    role === UserRole.Agent ||
    role === UserRole.Admin
  ) {
    return (
      <PostPropertyButton size="lg" className="h-12">
        Post your property for free
      </PostPropertyButton>
    );
  }

  // Seeker — offer a one-click upgrade to an owner account.
  const becomeOwner = async () => {
    setUpgrading(true);
    setError(null);
    const res = await completeSignupProfile({ role: UserRole.Owner });
    if (!res.success) {
      setError(res.error || "Couldn't switch your account. Try again.");
      setUpgrading(false);
      return;
    }
    router.refresh(); // re-render this page as an owner
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button size="lg" className="h-12" onClick={becomeOwner} disabled={upgrading}>
        {upgrading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Setting up…
          </>
        ) : (
          <>
            List your property <ArrowRight className="size-4" />
          </>
        )}
      </Button>
      <p className="text-muted-foreground text-xs">
        We&apos;ll switch your account to an owner account so you can post.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
