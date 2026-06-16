import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/**
 * Browser-side Better Auth client. Mirrors the server plugins (emailOTP only —
 * no organization plugin, unlike form-builder-portal).
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [emailOTPClient()],
});

export const { signOut, useSession, getSession, signIn } = authClient;
export const emailOtp = authClient.emailOtp;

/**
 * Force the shared client session store (the one `useSession` subscribes to) to
 * refetch from the server.
 *
 * Better Auth keeps that store in sync only for mutations it performs itself
 * (sign-in, sign-out, updateUser, …). When we change the user another way — e.g.
 * `completeSignupProfile` writes name + role straight to the DB via a server
 * action — the cached session goes stale and the header keeps showing the old
 * value until a full page reload. Toggling `$sessionSignal` triggers the same
 * refetch Better Auth uses internally, so the header updates without a reload.
 */
export function refreshSession() {
  authClient.$store.notify("$sessionSignal");
}
