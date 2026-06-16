import Link from "next/link";
import {
  ChevronRight,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { UserRole } from "@/lib/enums";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { ProfileCard } from "@/features/account/components/profile-card";
import { WorkspaceHeader } from "@/components/common/workspace-header";
import { Reveal } from "@/components/common/reveal";

export const metadata = { title: "My account" };

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Seeker]: "Home seeker",
  [UserRole.Owner]: "Property owner",
  [UserRole.Agent]: "Agent / broker",
  [UserRole.Admin]: "Administrator",
};

type QuickLink = { href: string; icon: LucideIcon; title: string; desc: string };

export default async function AccountPage() {
  const user = await requireUser();
  const canListProperties =
    user.role === UserRole.Owner ||
    user.role === UserRole.Agent ||
    user.role === UserRole.Admin;

  // Role-aware shortcuts to the things this user can actually do.
  const links: QuickLink[] = [
    {
      href: "/wishlist",
      icon: Heart,
      title: "Saved homes",
      desc: "Properties you've shortlisted",
    },
    {
      href: "/enquiries",
      icon: MessageSquare,
      title: "My enquiries",
      desc: "Track owners' replies",
    },
    ...(canListProperties
      ? [
          {
            href: "/dashboard",
            icon: LayoutDashboard,
            title: "Owner dashboard",
            desc: "Listings, leads & insights",
          },
          {
            href: "/post-property",
            icon: Plus,
            title: "Post a property",
            desc: "List a new home",
          },
        ]
      : []),
    ...(user.role === UserRole.Admin
      ? [
          {
            href: "/admin",
            icon: Shield,
            title: "Admin panel",
            desc: "Moderation & platform tools",
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <WorkspaceHeader
        icon={User}
        accent="violet"
        title="My account"
        subtitle="Manage your profile and jump back into your activity."
      />

      <Reveal delay={80}>
        <ProfileCard
          initialName={user.name}
          email={user.email}
          roleLabel={ROLE_LABELS[user.role]}
          status={user.status}
          createdAt={user.createdAt}
        />
      </Reveal>

      <Reveal delay={140}>
        <section>
          <h2 className="font-display mb-3 text-lg font-semibold">Quick links</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group border-border bg-card shadow-soft hover:border-primary/30 flex items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <l.icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {l.desc}
                  </p>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal delay={200}>
        <section className="border-border bg-card shadow-soft flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Session</h2>
            <p className="text-muted-foreground text-sm">
              Sign out of Trade House on this device.
            </p>
          </div>
          <SignOutButton />
        </section>
      </Reveal>
    </div>
  );
}
