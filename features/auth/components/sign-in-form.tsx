"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { emailOtp } from "@/lib/auth-client";
import { AuthFlow } from "@/lib/enums";
import { safeInternalPath } from "@/lib/auth-permissions";
import { emailExists } from "@/features/auth/auth.actions";
import { signInSchema, type SignInValues } from "@/features/auth/auth.schema";
import { Reveal } from "@/components/common/reveal";
import { AlertMessage } from "@/components/common/alert-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only carry a SAME-ORIGIN redirect forward — drop attacker-controlled
  // absolute/scheme-relative values so they can't reach the post-auth push.
  const redirect = safeInternalPath(searchParams.get("redirect")) ?? "";
  const defaultEmail = searchParams.get("email") ?? "";

  // Business/submission errors (distinct from per-field validation messages).
  const [formError, setFormError] = useState<React.ReactNode>(null);

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: "onChange",
    defaultValues: { email: defaultEmail },
  });

  // Validate a pre-filled email on mount so the button enables right away.
  useEffect(() => {
    if (defaultEmail) form.trigger();
  }, [defaultEmail, form]);

  const onSubmit = async ({ email }: SignInValues) => {
    setFormError(null);
    try {
      // Sign-in requires an existing account — don't auto-create one.
      const exists = await emailExists(email);
      if (!exists) {
        const signupHref = `/auth/signup?${new URLSearchParams({ email }).toString()}`;
        setFormError(
          <>
            No account found with this email.{" "}
            <Link href={signupHref}>Create one</Link> to get started.
          </>,
        );
        return;
      }

      const { error } = await emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      });
      if (error) {
        setFormError(error.message || "Failed to send verification code");
        return;
      }
      const params = new URLSearchParams({ email, flow: AuthFlow.SignIn });
      if (redirect) params.set("redirect", redirect);
      router.push(`/auth/verify-otp?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setFormError("Something went wrong. Please try again.");
    }
  };

  const { isSubmitting, isValid } = form.formState;

  // Carry whatever the visitor has typed across to signup (nice-to-have).
  const emailValue = useWatch({ control: form.control, name: "email" });
  const typedEmail = emailValue?.trim();
  const signupHref = typedEmail
    ? `/auth/signup?${new URLSearchParams({ email: typedEmail }).toString()}`
    : "/auth/signup";

  return (
    <div className="space-y-7">
      <Reveal className="space-y-2 text-center sm:text-left">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-[2rem]">
          Welcome back
        </h1>
        <p className="text-muted-foreground text-pretty">
          Sign in with a one-time code — no password to remember.
        </p>
      </Reveal>

      <Reveal delay={80}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        autoFocus
                        disabled={isSubmitting}
                        className="h-12 rounded-xl pl-10 text-base"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formError && (
              <AlertMessage variant="error">{formError}</AlertMessage>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="h-12 w-full rounded-xl text-[0.95rem] font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Sending code…
                </>
              ) : (
                <>
                  Continue <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </Reveal>

      <Reveal delay={150}>
        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href={signupHref}
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
