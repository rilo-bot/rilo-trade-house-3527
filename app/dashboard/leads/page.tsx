import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { UserRole } from "@/lib/enums";
import { listOwnerLeads } from "@/features/leads/leads.service";
import { LeadsInbox } from "@/features/leads/components/leads-inbox";
import { Reveal } from "@/components/common/reveal";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const user = await requireRole([UserRole.Owner, UserRole.Agent, UserRole.Admin]);
  const leads = await listOwnerLeads(user);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Reveal>
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>

        <div className="mb-6">
          <p className="text-muted-foreground text-sm font-medium">
            <span className="text-primary">Your pipeline</span>
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Leads
          </h1>
          <p className="text-muted-foreground mt-1">
            {leads.length} {leads.length === 1 ? "enquiry" : "enquiries"} on your
            listings
          </p>
        </div>
      </Reveal>

      <LeadsInbox initial={leads} />
    </div>
  );
}
