import { buildCsp } from "./lib/security/csp";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

function isLocalOrLoopbackAppUrl(): boolean {
  for (const raw of [process.env.NEXT_PUBLIC_APP_URL, process.env.NEXTAUTH_URL]) {
    if (!raw) continue;
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host.endsWith(".localhost")
      ) {
        return true;
      }
    } catch {
      // ignore invalid URL
    }
  }
  return false;
}

function shouldSendStrictTransportSecurity(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (process.env.DISABLE_HSTS === "1") return false;
  if (isLocalOrLoopbackAppUrl()) return false;
  return true;
}

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  // SEC-0014: no X-Powered-By: Next.js on every response.
  poweredByHeader: false,
  // MIYO-0012: Streamline "Build" was ported into /projects; keep old links working.
  async redirects() {
    return [
      // QA-D006: /login and /register are what people type; this app signs
      // in at /signin.
      { source: "/login", destination: "/signin", permanent: false },
      { source: "/register", destination: "/signin", permanent: false },
      { source: "/build", destination: "/projects", permanent: false },
      // QA-AUTH-07: the QR code manager moved off the CEO-named path.
      { source: "/ceo/qr-code", destination: "/tools/qr-code", permanent: true },
      { source: "/build/:path*", destination: "/projects/:path*", permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        ...(process.env.NODE_ENV === "development"
          ? ["*.devtunnels.ms", "*.vscode.dev"]
          : []),
        ...(() => {
          try {
            return process.env.NEXT_PUBLIC_APP_URL
              ? [new URL(process.env.NEXT_PUBLIC_APP_URL).host]
              : [];
          } catch {
            return [];
          }
        })(),
      ],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "crm.miyoglobal.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  headers: async () => {
    const hsts = shouldSendStrictTransportSecurity()
      ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
      : [];

    const commonHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { key: "X-XSS-Protection", value: "0" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      ...hsts,
    ];

    const fullCsp = buildCsp(process.env.NODE_ENV);

    return [
      { source: "/(.*)", headers: commonHeaders },
      {
        // All page routes: strict no-framing. The CSP for pages is set in
        // proxy.ts, which can mint a per-request nonce; setting it here too
        // would send two policies and the browser would enforce both
        // (MIYO-0132).
        source: "/:path((?!api/).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      ...["/reset-password", "/setup-password", "/invitation/:token"].map((source) => ({
        // Links carrying a one-time token never send it on as a Referer
        // (QA-SEC-12). Listed after the catch-all, so this value wins.
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
      {
        // All API routes except the download proxy: strict no-framing
        source: "/api/:path((?!storage/download).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: fullCsp },
        ],
      },
      {
        // Offer letter inline preview: allow same-origin iframe (like résumé download)
        source: "/api/hr/recruitment/candidates/:candidateId/offers/:offerId/generate-letter/preview",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        // Download proxy: allow same-origin iframe for PDF resume preview
        source: "/api/storage/download",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_QR_REDIRECT_BASE_URL:
      process.env.NEXT_PUBLIC_QR_REDIRECT_BASE_URL,
  },
};

const sentryEnabled = !!process.env.SENTRY_AUTH_TOKEN;

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig;
