import Link from "next/link";
import Image from "next/image";
import {
  Bookmark,
  Building2,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { ListingStatus, UserRole } from "@/lib/enums";
import { getPlatformStats, getRecentListings } from "@/features/admin/admin.service";
import {
  STATUS_BADGE,
  STATUS_LABELS,
  formatSalePrice,
} from "@/features/listings/listing-labels";
import { StatCard } from "@/components/dashboard/stat-card";
import { WorkspaceHeader } from "@/components/common/workspace-header";
import { Reveal } from "@/components/common/reveal";
import { cn, imageSrc } from "@/lib/utils";

export const metadata = { title: "Admin" };

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Seeker]: "Seekers",
  [UserRole.Owner]: "Owners",
  [UserRole.Agent]: "Agents",
  [UserRole.Admin]: "Admins",
};

const ROLE_BAR: Record<UserRole, string> = {
  [UserRole.Seeker]: "bg-primary",
  [UserRole.Owner]: "bg-emerald-500",
  [UserRole.Agent]: "bg-violet-500",
  [UserRole.Admin]: "bg-amber-500",
};

// Render order + bar colour for the listings-by-status breakdown.
const STATUS_ORDER: ListingStatus[] = [
  ListingStatus.Active,
  ListingStatus.Draft,
  ListingStatus.PendingReview,
  ListingStatus.RentedSold,
  ListingStatus.Expired,
  ListingStatus.Rejected,
];

const STATUS_BAR: Record<ListingStatus, string> = {
  [ListingStatus.Active]: "bg-emerald-500",
  [ListingStatus.Draft]: "bg-muted-foreground/50",
  [ListingStatus.PendingReview]: "bg-amber-500",
  [ListingStatus.RentedSold]: "bg-blue-500",
  [ListingStatus.Expired]: "bg-slate-400",
  [ListingStatus.Rejected]: "bg-destructive",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const min = Math.round((Date.now() - then) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

export default async function AdminPage() {
  const user = await requireRole([UserRole.Admin]);
  const [stats, recent] = await Promise.all([
    getPlatformStats(),
    getRecentListings(6),
  ]);

  const role = (r: UserRole) => stats.users.byRole[r] ?? 0;
  const status = (s: ListingStatus) => stats.listings.byStatus[s] ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <WorkspaceHeader
        icon={ShieldCheck}
        accent="slate"
        title="Admin"
        subtitle={`${user.email} · platform overview`}
      />

      {/* Platform totals. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal delay={0}>
          <StatCard
            icon={Users}
            accent="primary"
            label="Total users"
            value={stats.users.total}
            hint={`${role(UserRole.Seeker)} seekers · ${role(UserRole.Owner)} owners`}
          />
        </Reveal>
        <Reveal delay={80}>
          <StatCard
            icon={Building2}
            accent="emerald"
            label="Total listings"
            value={stats.listings.total}
            hint={`${status(ListingStatus.Active)} active · ${status(ListingStatus.Draft)} draft`}
          />
        </Reveal>
        <Reveal delay={160}>
          <StatCard
            icon={MessageSquare}
            accent="violet"
            label="Enquiries"
            value={stats.leads}
            hint="leads across all listings"
          />
        </Reveal>
        <Reveal delay={240}>
          <StatCard
            icon={Bookmark}
            accent="amber"
            label="Saves"
            value={stats.saves}
            hint="wishlist adds platform-wide"
          />
        </Reveal>
      </div>

      {/* Breakdowns. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <section className="border-border bg-card shadow-soft h-full rounded-2xl border p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Users by role</h2>
            <div className="mt-4 space-y-3">
              {Object.values(UserRole).map((r) => (
                <StatBar
                  key={r}
                  label={ROLE_LABELS[r]}
                  value={role(r)}
                  total={stats.users.total}
                  color={ROLE_BAR[r]}
                />
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal delay={120}>
          <section className="border-border bg-card shadow-soft h-full rounded-2xl border p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Listings by status</h2>
            <div className="mt-4 space-y-3">
              {STATUS_ORDER.filter((s) => status(s) > 0).length === 0 ? (
                <p className="text-muted-foreground text-sm">No listings yet.</p>
              ) : (
                STATUS_ORDER.filter((s) => status(s) > 0).map((s) => (
                  <StatBar
                    key={s}
                    label={STATUS_LABELS[s]}
                    value={status(s)}
                    total={stats.listings.total}
                    color={STATUS_BAR[s]}
                  />
                ))
              )}
            </div>
          </section>
        </Reveal>
      </div>

      {/* Recent listings. */}
      <Reveal>
        <section className="border-border bg-card shadow-soft rounded-2xl border p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Recent listings</h2>
          {recent.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              No listings on the platform yet.
            </p>
          ) : (
            <ul className="mt-4 divide-border divide-y">
              {recent.map((l) => {
                const isActive = l.status === ListingStatus.Active;
                const cover = l.media?.images?.[0];
                const inner = (
                  <>
                    <div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-lg">
                      {cover ? (
                        <Image
                          src={imageSrc(cover)}
                          alt={l.title}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="text-muted-foreground flex h-full items-center justify-center">
                          <Building2 className="size-5 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[11px] font-medium",
                            STATUS_BADGE[l.status],
                          )}
                        >
                          {STATUS_LABELS[l.status]}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {relativeTime(l.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm font-medium">
                        {l.title}
                      </p>
                      <p className="text-muted-foreground line-clamp-1 text-xs">
                        {formatSalePrice(l.price)} · {l.location.locality},{" "}
                        {l.location.city}
                      </p>
                    </div>
                  </>
                );
                const rowClass =
                  "-mx-2 flex items-center gap-3 rounded-lg px-2 py-3";
                return (
                  <li key={l.id}>
                    {isActive ? (
                      <Link
                        href={`/properties/${l.id}`}
                        className={cn(rowClass, "hover:bg-muted/50 transition-colors")}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className={rowClass}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Reveal>

      <p className="text-muted-foreground text-center text-xs">
        Moderation actions (approve / reject listings, manage users) arrive in a
        later phase.
      </p>
    </div>
  );
}

function StatBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value}
          <span className="ml-1 text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
