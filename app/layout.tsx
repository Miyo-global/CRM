import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { IBM_Plex_Mono, Montserrat, Plus_Jakarta_Sans } from "next/font/google";

import "../globals.css";
import { BRAND } from "@/lib/design/brand-hex";
import { Toaster } from "../components/ui/sonner";
import { SessionProvider } from "../components/providers/session-provider";
import { ThemeProvider } from "../components/theme-provider";
import { MotionProvider } from "../components/providers/motion-provider";
import { QueryProvider } from "../components/providers/query-provider";
import { CRM_BASE_URL } from "@/lib/constants/company";

const display = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

/**
 * metadataBase is evaluated while Next collects page data, so a bad value
 * fails the production build rather than degrading at runtime. Never let a
 * misconfigured env var get that far.
 */
function resolveMetadataBase(): URL {
  for (const candidate of [process.env.NEXT_PUBLIC_APP_URL, CRM_BASE_URL]) {
    if (!candidate?.trim()) continue;
    try {
      return new URL(candidate);
    } catch {
      /* try the next candidate */
    }
  }
  return new URL("https://crm.miyoglobal.com");
}

export const metadata: Metadata = {
  // HR and projects, not a sales CRM (MIYO-0302, R3-0029).
  title: {
    default: "Miyo Global",
    template: "%s | Miyo Global",
  },
  description: "Payroll, attendance, leave and onboarding alongside project tracking, in one internal workspace.",
  metadataBase: resolveMetadataBase(),
  openGraph: {
    type: "website",
    siteName: "Miyo Global",
    title: "Miyo Global",
    description: "Payroll, attendance, leave and onboarding alongside project tracking, in one internal workspace.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND.canvas },
    { media: "(prefers-color-scheme: dark)", color: BRAND.inkDeep },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // QA-SEC-01: script-src is nonce + 'strict-dynamic' with no 'unsafe-inline'
  // (proxy.ts). Next only stamps its inline scripts with the nonce when a page
  // renders per request, and a static page's scripts would be blocked, so
  // reading the request here keeps every page dynamic. next-themes' inline
  // theme script needs the nonce passed in by hand.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="font-sans h-full min-h-0 bg-background text-foreground antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            nonce={nonce}
          >
          <SessionProvider>
            <QueryProvider>
              <MotionProvider>
                {children}
              </MotionProvider>
              <Toaster />
            </QueryProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
