import { Suspense } from "react";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <SignInForm />
    </Suspense>
  );
}
