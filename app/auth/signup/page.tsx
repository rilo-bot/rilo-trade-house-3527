import { Suspense } from "react";
import { SignupForm } from "@/features/auth/components/signup-form";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";

export const metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <SignupForm />
    </Suspense>
  );
}
