"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Loader2, Mail, Pencil, X } from "lucide-react";
import { updateDisplayName } from "@/features/auth/auth.actions";
import { updateNameSchema } from "@/features/auth/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Initials for the avatar: first letters of the first two name words, else the
 *  email's first two chars. */
function initials(name: string, email: string): string {
  const n = name.trim();
  if (n) {
    const parts = n.split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return (a + b || n.slice(0, 2)).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/**
 * Identity card for the account page: avatar + inline-editable display name,
 * email, role / status badges, and "member since". The name edit posts to the
 * `updateDisplayName` server action and refreshes so the header reflects it.
 */
export function ProfileCard({
  initialName,
  email,
  roleLabel,
  status,
  createdAt,
}: {
  initialName: string;
  email: string;
  roleLabel: string;
  status: string;
  createdAt?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = status === "active";
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("en-NZ", {
        month: "long",
        year: "numeric",
      })
    : null;

  const startEdit = () => {
    setDraft(name);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    const parsed = updateNameSchema.safeParse({ name: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await updateDisplayName({ name: draft });
      if (!res.success) {
        setError(res.error ?? "Failed to save");
        return;
      }
      setName(res.name ?? draft.trim());
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-border bg-card shadow-soft rounded-2xl border p-6">
      <div className="flex items-start gap-4">
        <span className="from-primary to-primary-hover text-primary-foreground grid size-16 shrink-0 place-items-center rounded-2xl bg-linear-to-br text-xl font-semibold shadow-sm">
          {initials(name, email)}
        </span>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void save();
                    if (e.key === "Escape") cancel();
                  }}
                  disabled={saving}
                  maxLength={80}
                  aria-label="Display name"
                  className="h-10 max-w-xs"
                />
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancel}
                  disabled={saving}
                >
                  <X className="size-4" />
                  Cancel
                </Button>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="font-display truncate text-2xl font-bold tracking-tight">
                {name || "Add your name"}
              </h2>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={startEdit}
                aria-label="Edit name"
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-4" />
              </Button>
            </div>
          )}

          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            <Mail className="size-3.5 shrink-0" />
            <span className="truncate">{email}</span>
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
              {roleLabel}
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {isActive ? "Active" : "Suspended"}
            </span>
            {memberSince && (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Calendar className="size-3.5" /> Member since {memberSince}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
