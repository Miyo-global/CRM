import type { Metadata } from "next";

import "../globals.css";
import { Toaster } from "../components/ui/sonner";
import { SessionProvider } from "../components/providers/session-provider";
import { ThemeProvider } from "../components/theme-provider";
import { MotionProvider } from "../components/providers/motion-provider";
import { QueryProvider } from "../components/providers/query-provider";

export const metadata: Metadata = {
  title: {
    default: "Miyo Global CRM",
    template: "%s | Miyo Global CRM",
  },
  description: "Advanced HR, Project Management, and CRM platform for modern teams.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://crm.miyoglobal.com"),
  openGraph: {
    type: "website",
    siteName: "Miyo Global CRM",
    title: "Miyo Global CRM",
    description: "Advanced HR, Project Management, and CRM platform for modern teams.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&family=Playfair+Display:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans h-full min-h-0 bg-background text-foreground antialiased selection:bg-gold/30 selection:text-gold noir-grain">
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            disableTransitionOnChange
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
