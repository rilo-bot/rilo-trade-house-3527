import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Logo } from "@/components/layout/logo";

/** App-wide footer with brand blurb + link columns. */
export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="mx-auto w-full max-w-page px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="text-muted-foreground max-w-xs text-sm">
              {siteConfig.description}
            </p>
          </div>

          {/* Link columns */}
          {siteConfig.footerNav.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.title}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-muted-foreground border-border mt-10 border-t pt-6 text-sm">
          © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
