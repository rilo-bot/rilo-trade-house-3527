import { cn } from "@/lib/utils";

/** Shared centered section title + subtitle, reused across marketing sections. */
export function SectionHeading({
  title,
  subtitle,
  align = "center",
  className,
}: {
  title: string;
  subtitle?: string;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle ? (
        <p className="text-muted-foreground max-w-xl">{subtitle}</p>
      ) : null}
    </div>
  );
}
