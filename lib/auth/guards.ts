import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { defaultRouteForRole, isRole } from "@/lib/auth-permissions";
import { UserRole } from "@/lib/enums";

/**
 * Server-side session helpers for Server Components, route handlers, and server
 * actions. These read the Better Auth session from request headers.
 */

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: string;
  /** Account creation time (ISO). Absent if the user-doc lookup falls back to
   *  the session snapshot. Powers the account page's "member since". */
  createdAt?: string;
}

/** Returns the current user, or null when unauthenticated. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const u = session.user as typeof session.user & {
    role?: string;
    status?: string;
  };

  // The session can be served from Better Auth's short-lived cookie cache, so
  // its `name`/`role`/`status` may be stale (e.g. right after signup, or after a
  // direct DB edit). Read those authoritative fields fresh from the user doc and
  // fall back to the session snapshot if the lookup fails.
  let name = u.name ?? "";
  let role = isRole(u.role) ? u.role : UserRole.Seeker;
  let status = u.status ?? "active";
  let createdAt: string | undefined;

  try {
    const db = await getDb();
    const doc = await db
      .collection("user")
      .findOne(
        { _id: new ObjectId(u.id) },
        { projection: { name: 1, role: 1, status: 1, createdAt: 1 } },
      );
    if (doc) {
      name = typeof doc.name === "string" ? doc.name : name;
      role = isRole(doc.role) ? doc.role : role;
      status = typeof doc.status === "string" ? doc.status : status;
      if (doc.createdAt instanceof Date) createdAt = doc.createdAt.toISOString();
    }
  } catch (error) {
    console.error("[getCurrentUser] profile lookup failed:", error);
  }

  return {
    id: u.id,
    email: u.email,
    name,
    role,
    status,
    createdAt,
  };
}

/** Requires an authenticated user; redirects to sign-in otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  return user;
}

/**
 * Requires the visitor to be signed OUT (for /auth/* pages). Already-signed-in
 * users are bounced to their role's default landing page.
 */
export async function requireGuest(): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect(defaultRouteForRole(user.role));
}

/**
 * Requires the user to hold one of `allowed`. Redirects unauthenticated users
 * to sign-in and wrong-role users to their own default landing page.
 */
export async function requireRole(allowed: UserRole[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    redirect(user.role === UserRole.Admin ? "/admin" : "/");
  }
  return user;
}
