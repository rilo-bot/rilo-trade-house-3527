import { LeadStatus } from "@/lib/enums";

/** Client-safe labels + badge styles for lead statuses. */
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.New]: "New",
  [LeadStatus.Contacted]: "Contacted",
  [LeadStatus.ClosedWon]: "Closed · Won",
  [LeadStatus.ClosedLost]: "Closed · Lost",
};

// `dark:` variants keep the tinted pills legible on dark navy surfaces.
export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  [LeadStatus.New]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  [LeadStatus.Contacted]:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  [LeadStatus.ClosedWon]:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  [LeadStatus.ClosedLost]: "bg-muted text-muted-foreground",
};

/** Statuses an owner can move a lead through, in order. */
export const LEAD_STATUS_FLOW: LeadStatus[] = [
  LeadStatus.New,
  LeadStatus.Contacted,
  LeadStatus.ClosedWon,
  LeadStatus.ClosedLost,
];

/**
 * Seeker-facing view of the SAME status. The owner pipeline (New → Contacted →
 * Closed Won/Lost) is the owner's CRM; a seeker only cares whether the owner has
 * replied, so we relabel: New = "Awaiting reply", Contacted = "Owner responded",
 * and both closed states collapse to a neutral "Closed".
 */
export const SEEKER_LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.New]: "Awaiting reply",
  [LeadStatus.Contacted]: "Owner responded",
  [LeadStatus.ClosedWon]: "Closed",
  [LeadStatus.ClosedLost]: "Closed",
};

export const SEEKER_LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  // Pending — amber reads as "waiting on them".
  [LeadStatus.New]:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  // Positive — the owner got back to you.
  [LeadStatus.Contacted]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  [LeadStatus.ClosedWon]: "bg-muted text-muted-foreground",
  [LeadStatus.ClosedLost]: "bg-muted text-muted-foreground",
};

/** Seeker-facing filter buckets (Won + Lost collapse into "Closed"). */
export type SeekerLeadBucket = "awaiting" | "responded" | "closed";

export function seekerBucketFor(status: LeadStatus): SeekerLeadBucket {
  if (status === LeadStatus.New) return "awaiting";
  if (status === LeadStatus.Contacted) return "responded";
  return "closed";
}
