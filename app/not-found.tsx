import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Rendered for unmatched routes and on `notFound()` calls. */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="text-muted-foreground max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
