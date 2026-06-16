"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { emailOtp, signIn, getSession, refreshSession } from "@/lib/auth-client";
import {
  defaultRouteForRole,
  isRole,
  safeInternalPath,
  type SelfAssignableRole,
} from "@/lib/auth-permissions";
import { UserRole, AuthFlow } from "@/lib/enums";
import { completeSignupProfile } from "@/features/auth/auth.actions";
import { Reveal } from "@/components/common/reveal";
import { AlertMessage } from "@/components/common/alert-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const OTP_LENGTH = 6;

export function OtpVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = searchParams.get("email") ?? "";
  const flow =
    searchParams.get("flow") === AuthFlow.SignUp
      ? AuthFlow.SignUp
      : AuthFlow.SignIn;
  const name = searchParams.get("name") ?? "";
  const roleParam = searchParams.get("role");
  const redirect = searchParams.get("redirect") ?? "";
  const role: SelfAssignableRole =
    roleParam === UserRole.Owner || roleParam === UserRole.Agent
      ? (roleParam as SelfAssignableRole)
      : UserRole.Seeker;
  const backPath = flow === AuthFlow.SignUp ? "/auth/signup" : "/auth/sign-in";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.replace(backPath);
      return;
    }
    inputRefs.current[0]?.focus();
  }, [email, router, backPath]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const finishRedirect = async () => {
    // Resolve where to land: a SAFE explicit redirect wins, else role default.
    // `redirect` is attacker-controllable (URL param), so it must be validated
    // as a same-origin path before we navigate — never trust it raw.
    let target = safeInternalPath(redirect);
    if (!target) {
      const { data } = await getSession();
      const r = (data?.user as { role?: string } | undefined)?.role;
      target = defaultRouteForRole(isRole(r) ? r : UserRole.Seeker);
    }
    router.push(target);
    router.refresh();
  };

  const handleVerify = async (code: string) => {
    if (!email || code.length !== OTP_LENGTH) return;
    setIsLoading(true);
    setError(null);
    try {
      const { error: signInError } = await signIn.emailOtp({ email, otp: code });
      if (signInError) {
        setError(signInError.message || "Invalid verification code");
        setOtp(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        return;
      }

      // New signup: persist name + chosen role (server-validated).
      if (flow === AuthFlow.SignUp) {
        const res = await completeSignupProfile({ name, role });
        if (!res.success) {
          setError(res.error || "Failed to save your profile");
          return;
        }
        // The profile was written straight to the DB, so the client session
        // cache the header reads is stale. Refetch it so the user's name/role
        // show immediately instead of after a manual page refresh.
        refreshSession();
      }

      await finishRedirect();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setError(null);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) handleVerify(next.join(""));
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = pasted.split("").concat(Array(OTP_LENGTH - pasted.length).fill(""));
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) handleVerify(pasted);
  };

  const handleResend = async () => {
    if (!email || countdown > 0) return;
    setIsResending(true);
    setError(null);
    try {
      const { error } = await emailOtp.sendVerificationOtp({ email, type: "sign-in" });
      if (error) {
        setError(error.message || "Failed to resend code");
        return;
      }
      setCountdown(60);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-7">
      <Reveal className="flex flex-col items-center gap-3 text-center">
        <div className="bg-primary/10 text-primary grid size-14 place-items-center rounded-2xl">
          <KeyRound className="size-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-[2rem]">
            Check your email
          </h1>
          <p className="text-muted-foreground text-pretty">
            We sent a {OTP_LENGTH}-digit code to{" "}
            <span className="text-foreground font-medium">{email}</span>
          </p>
        </div>
      </Reveal>

      <Reveal delay={80} className="space-y-6">
        <div
          role="group"
          aria-label={`Enter the ${OTP_LENGTH}-digit verification code`}
          className="flex justify-center gap-1.5 sm:gap-2.5"
          onPaste={handlePaste}
        >
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
              aria-invalid={error ? true : undefined}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className={`size-10 rounded-xl p-0 text-center text-xl font-semibold transition-colors sm:size-13 ${
                digit ? "border-primary bg-primary/5" : ""
              }`}
            />
          ))}
        </div>

        {error && <AlertMessage variant="error">{error}</AlertMessage>}

        <div className="text-muted-foreground flex items-center justify-center gap-1 text-sm">
          <span>Didn&apos;t get it?</span>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleResend}
            disabled={isResending || countdown > 0}
            className="h-auto p-0"
          >
            {isResending ? (
              <>
                <RefreshCw className="size-3 animate-spin" /> Sending…
              </>
            ) : countdown > 0 ? (
              `Resend in ${countdown}s`
            ) : (
              "Resend code"
            )}
          </Button>
        </div>
      </Reveal>

      <Reveal delay={150} className="flex flex-col gap-3">
        <Button
          type="button"
          onClick={() => handleVerify(otp.join(""))}
          disabled={isLoading || otp.some((d) => !d)}
          className="h-12 w-full rounded-xl text-[0.95rem] font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Verifying…
            </>
          ) : (
            "Verify & continue"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(backPath)}
          className="text-muted-foreground h-11 rounded-xl"
        >
          <ArrowLeft className="size-4" /> Use a different email
        </Button>
      </Reveal>
    </div>
  );
}
