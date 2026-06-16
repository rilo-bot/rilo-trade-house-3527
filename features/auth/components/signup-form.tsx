"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Loader2,
  Home,
  Search,
  Building2,
  User,
  Mail,
} from "lucide-react";
import { emailOtp } from "@/lib/auth-client";
import type { SelfAssignableRole } from "@/lib/auth-permissions";
import { UserRole, AuthFlow } from "@/lib/enums";
import { emailExists } from "@/features/auth/auth.actions";
import { signupSchema, type SignupValues } from "@/features/auth/auth.schema";
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

const ROLE_OPTIONS: {
  value: SelfAssignableRole;
  label: string;
  hint: string;
  icon: typeof Search;
}[] = [
  { value: UserRole.Seeker, label: "Find a home", hint: "Buy / rent / PG", icon: Search },
  { value: UserRole.Owner, label: "List my property", hint: "I'm an owner", icon: Home },
  { value: UserRole.Agent, label: "I'm an agent", hint: "Broker / dealer", icon: Building2 },
];

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<React.ReactNode>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: searchParams.get("email") ?? "",
      role: UserRole.Seeker,
    },
  });

  const selectedRole = useWatch({ control: form.control, name: "role" });

  const onSubmit = async ({ name, email, role }: SignupValues) => {
    setFormError(null);
    try {
      // Don't let someone "sign up" over an existing account.
      const exists = await emailExists(email);
      if (exists) {
        const signInHref = `/auth/sign-in?${new URLSearchParams({ email }).toString()}`;
        setFormError(
          <>
            An account already exists with this email.{" "}
            <Link href={signInHref}>Sign in</Link> instead.
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
      const params = new URLSearchParams({
        email,
        flow: AuthFlow.SignUp,
        name,
        role,
      });
      router.push(`/auth/verify-otp?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setFormError("Something went wrong. Please try again.");
    }
  };

  const { isSubmitting, isValid } = form.formState;

  // Carry whatever the visitor has typed across to sign-in (nice-to-have).
  const emailValue = useWatch({ control: form.control, name: "email" });
  const typedEmail = emailValue?.trim();
  const signInHref = typedEmail
    ? `/auth/sign-in?${new URLSearchParams({ email: typedEmail }).toString()}`
    : "/auth/sign-in";

  return (
    <div className="space-y-7">
      <Reveal className="space-y-2 text-center sm:text-left">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-[2rem]">
          Create your account
        </h1>
        <p className="text-muted-foreground text-pretty">
          Join in seconds — we&apos;ll email you a one-time code, no password
          needed.
        </p>
      </Reveal>

      <Reveal delay={80}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                      <Input
                        placeholder="Jane Doe"
                        autoComplete="name"
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

            <div className="space-y-2">
              <p className="text-sm leading-none font-medium">I want to…</p>
              <div
                role="radiogroup"
                aria-label="What do you want to do?"
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                {ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = selectedRole === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        form.setValue("role", opt.value, {
                          shouldValidate: true,
                        })
                      }
                      disabled={isSubmitting}
                      className={`flex flex-row items-center gap-3 rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-col sm:items-center sm:gap-1.5 sm:text-center ${
                        active
                          ? "border-primary bg-primary/5 text-foreground ring-2 ring-primary/25"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:bg-muted"
                      }`}
                    >
                      <Icon
                        className={`size-5 shrink-0 ${active ? "text-primary" : ""}`}
                      />
                      <span className="flex flex-col">
                        <span className="text-xs leading-tight font-medium">
                          {opt.label}
                        </span>
                        <span className="text-[10px] leading-tight opacity-70">
                          {opt.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

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
                  Create account <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </Form>
      </Reveal>

      <Reveal delay={150}>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link
            href={signInHref}
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
