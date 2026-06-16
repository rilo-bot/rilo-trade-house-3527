import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import { AssistantWidget } from "@/features/assistant/components/assistant-widget";
import { siteConfig } from "@/config/site";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face — used for headlines (hero, page headers) to give a modern,
// distinctive feel. Exposed as `--font-display` (see globals.css).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex flex-1 flex-col outline-none"
          >
            {children}
          </main>
          <ConditionalFooter>
            <SiteFooter />
          </ConditionalFooter>
          <AssistantWidget />
        </Providers>
      </body>
    </html>
  );
}
