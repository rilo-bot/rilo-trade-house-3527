"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    router.push("/auth/sign-in");
    router.refresh();
  };

  return (
    <Button variant="outline" onClick={handleSignOut} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      Sign out
    </Button>
  );
}
