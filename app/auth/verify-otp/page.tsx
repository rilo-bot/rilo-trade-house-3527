import { Suspense } from "react";
import { OtpVerificationForm } from "@/features/auth/components/otp-verification-form";
import { AuthFormSkeleton } from "@/features/auth/components/auth-form-skeleton";

export const metadata = { title: "Verify" };

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <OtpVerificationForm />
    </Suspense>
  );
}
