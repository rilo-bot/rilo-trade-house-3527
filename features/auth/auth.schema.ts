import { z } from "zod";
import { UserRole } from "@/lib/enums";

/**
 * Client-side validation schemas for the auth forms — the single source of
 * truth for field rules + messages. Server actions/Better Auth enforce their
 * own checks; these power inline messages and disable-until-valid in the UI.
 */

const email = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address");

/** Display-name rule, shared by signup and the account profile editor. */
export const displayName = z
  .string()
  .trim()
  .min(2, "Please enter your full name")
  .max(80, "Name is too long");

export const updateNameSchema = z.object({ name: displayName });
export type UpdateNameValues = z.infer<typeof updateNameSchema>;

export const signInSchema = z.object({ email });
export type SignInValues = z.infer<typeof signInSchema>;

export const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Please enter your full name")
    .max(80, "Name is too long"),
  email,
  role: z.enum([UserRole.Seeker, UserRole.Owner, UserRole.Agent]),
});
export type SignupValues = z.infer<typeof signupSchema>;
