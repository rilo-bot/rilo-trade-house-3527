"use server";

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/guards";
import {
  isSelfAssignableRole,
  type SelfAssignableRole,
} from "@/lib/auth-permissions";
import { updateNameSchema } from "@/features/auth/auth.schema";

/**
 * Whether an account already exists for `email`. Used by the auth forms to
 * give the right message before sending an OTP:
 *   - sign-in: reject unknown emails ("no account, please sign up")
 *   - signup:  reject known emails  ("account exists, please sign in")
 *
 * Better Auth stores email lowercased, so we normalise before querying.
 */
export async function emailExists(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  try {
    const db = await getDb();
    const existing = await db
      .collection("user")
      .findOne({ email: normalized }, { projection: { _id: 1 } });
    return existing !== null;
  } catch (error) {
    console.error("[emailExists] failed:", error);
    // Fail open so a DB hiccup doesn't block legitimate auth.
    return false;
  }
}

/**
 * Completes a new signup: persists the display name and the user's chosen role.
 *
 * Security: runs server-side and only accepts seeker/owner/agent — "admin" can
 * never be self-assigned. The role field is `input: false` in Better Auth, so
 * we write it directly to the user document here after verifying the session.
 */
export async function completeSignupProfile(input: {
  name?: string;
  role: SelfAssignableRole;
}): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!isSelfAssignableRole(input.role)) {
    return { success: false, error: "Invalid role" };
  }

  const update: Record<string, unknown> = {
    role: input.role,
    updatedAt: new Date(),
  };
  if (input.name && input.name.trim()) {
    update.name = input.name.trim();
  }

  try {
    const db = await getDb();
    await db
      .collection("user")
      .updateOne({ _id: new ObjectId(user.id) }, { $set: update });
    return { success: true };
  } catch (error) {
    console.error("[completeSignupProfile] failed:", error);
    return { success: false, error: "Failed to save profile" };
  }
}

/**
 * Updates the signed-in user's display name from the account page. Validates
 * server-side (2–80 chars) and returns the saved name on success so the client
 * can reflect it immediately.
 */
export async function updateDisplayName(
  input: unknown,
): Promise<{ success: boolean; name?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = updateNameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid name",
    };
  }
  const name = parsed.data.name;

  try {
    const db = await getDb();
    await db
      .collection("user")
      .updateOne(
        { _id: new ObjectId(user.id) },
        { $set: { name, updatedAt: new Date() } },
      );
    return { success: true, name };
  } catch (error) {
    console.error("[updateDisplayName] failed:", error);
    return { success: false, error: "Failed to save your name" };
  }
}
