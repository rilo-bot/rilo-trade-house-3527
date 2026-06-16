"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Pure helpers only (no DB) — safe to import in this Client Component.
import { INSIGHT_REGIONS, suburbsForRegion } from "../insights.data";

/** Region + suburb pickers that navigate to the chosen suburb's insights. */
export function InsightsSelector({
  region,
  suburb,
}: {
  region: string;
  suburb: string;
}) {
  const router = useRouter();
  const [reg, setReg] = useState(region);
  const [sub, setSub] = useState(suburb);
  const suburbs = suburbsForRegion(reg);

  const onRegion = (r: string) => {
    setReg(r);
    setSub(suburbsForRegion(r)[0] ?? "");
  };

  const view = () => {
    const sp = new URLSearchParams({ region: reg, suburb: sub });
    router.push(`/insights?${sp.toString()}`);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={reg} onValueChange={onRegion}>
        <SelectTrigger className="bg-card h-11 w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {INSIGHT_REGIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sub} onValueChange={setSub}>
        <SelectTrigger className="bg-card h-11 w-full gap-2 sm:w-56">
          <MapPin className="text-primary size-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {suburbs.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={view} size="lg" className="h-11 w-full shrink-0 sm:w-auto" disabled={!sub}>
        View suburb
      </Button>
    </div>
  );
}
