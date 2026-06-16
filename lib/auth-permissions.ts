import { UserRole } from "@/lib/enums";

/**
 * Role-based access control for trade-house.
 *
 * Unlike form-builder-portal (multi-tenant, organization-scoped roles), this is
 * a single-tenant B2C marketplace: every user has exactly ONE global role
 * ({@link UserRole}) stored on the user document. No Better Auth `organization`
 * plugin.
 *
 * Capability model (Phase 1):
 *   - Seeker : browse, save, contact owners. The default for every signup.
 *   - Owner  : seeker + post/manage their OWN listings (few).
 *   - Agent  : owner + post/manage MANY listings (broker/dealer).
 *   - Admin  : full platform access + moderation. Assigned manually, never
 *              self-selectable at signup.
 */

/** All roles, as an iterable runtime list. */
export const ROLES = Object.values(UserRole);

/** The roles a user is allowed to pick for themselves at signup. */
export const SELF_ASSIGNABLE_ROLES = [
  UserRole.Seeker,
  UserRole.Owner,
  UserRole.Agent,
] as const;

export type SelfAssignableRole = (typeof SELF_ASSIGNABLE_ROLES)[number];

/** Every action a role can be granted in Phase 1. Extend as features land. */
export type Permission =
  | "property:read"
  | "property:save"
  | "property:contact"
  | "property:create"
  | "property:manage-own"
  | "property:manage-any"
  | "user:moderate"
  | "admin:access";

const PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.Seeker]: ["property:read", "property:save", "property:contact"],
  [UserRole.Owner]: [
    "property:read",
    "property:save",
    "property:contact",
    "property:create",
    "property:manage-own",
  ],
  [UserRole.Agent]: [
    "property:read",
    "property:save",
    "property:contact",
    "property:create",
    "property:manage-own",
  ],
  [UserRole.Admin]: [
    "property:read",
    "property:save",
    "property:contact",
    "property:create",
    "property:manage-own",
    "property:manage-any",
    "user:moderate",
    "admin:access",
  ],
};

/** True if `role` is granted `permission`. */
export function can(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Narrowing type guard for untrusted role strings (from the DB / network). */
export function isRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (ROLES as string[]).includes(value)
  );
}

/** True if `value` is a role a user may assign to themselves. */
export function isSelfAssignableRole(
  value: unknown,
): value is SelfAssignableRole {
  return (
    typeof value === "string" &&
    (SELF_ASSIGNABLE_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Sanitize a post-auth `redirect` target. Returns the path only if it is a
 * SAME-ORIGIN, root-relative path; otherwise `null`. This blocks open-redirect
 * phishing via `?redirect=https://evil.com` or protocol-relative `//evil.com`
 * (a victim who authenticates would otherwise be bounced to the attacker site).
 *
 * Accepts: `/dashboard`, `/buy?region=Auckland`, `/properties/123#gallery`.
 * Rejects: anything not starting with a single `/`, scheme-relative `//host`,
 * and any backslash (browsers normalize a backslash to `/`, so `/\evil.com`
 * resolves to an external host). Pure and client-safe.
 */
export function safeInternalPath(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    return null;
  }
  return path;
}

/** Where each role lands after authenticating. */
export function defaultRouteForRole(role: UserRole): string {
  switch (role) {
    case UserRole.Admin:
      return "/admin";
    case UserRole.Owner:
    case UserRole.Agent:
      return "/dashboard";
    default:
      return "/";
  }
}
