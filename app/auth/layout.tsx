import type { ReactNode } from "react";
import { requireGuest } from "@/lib/auth/guards";
import { AuthShowcase } from "@/features/auth/components/auth-showcase";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // Already signed in? Don't show signup/sign-in — bounce to the right place.
  await requireGuest();

  return (
    <div className="grid min-h-[calc(100svh-3.5rem)] lg:grid-cols-2">
      {/* Branded showcase — left half on desktop, hidden on smaller screens. */}
      <AuthShowcase />

      {/* Form column — soft brand-tinted backdrop + a centred form. */}
      <div className="relative flex flex-col items-center justify-center px-5 py-12 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="from-accent to-background absolute inset-0 bg-linear-to-b" />
          <div className="bg-primary/10 absolute -top-20 right-0 size-80 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
