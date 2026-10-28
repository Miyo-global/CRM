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
      // People type /roles for the role editor; it lives under Settings (FR1-019).
      { source: "/roles", destination: "/settings/roles", permanent: false },
      { source: "/register", destination: "/signin", permanent: false },
      { source: "/build", destination: "/projects", permanent: false },
      // QA-AUTH-07: the QR code manager moved off the CEO-named path.
      { source: "/ceo/qr-code", destination: "/tools/qr-code", permanent: true },
      { source: "/build/:path*", destination: "/projects/:path*", permanent: false },
      // --- QA cluster C (routes-nav-aliases): guessed or old URLs -> canonical pages.
      // Each destination is a real app route (checked in route-links.test.ts).
      // Spaces and templates live under /knowledge/wiki (P2-knowledge-spaces-templates-404).
      { source: "/knowledge/spaces", destination: "/knowledge/wiki/spaces", permanent: false },
      { source: "/knowledge/spaces/:spaceId", destination: "/knowledge/wiki/spaces/:spaceId", permanent: false },
      { source: "/knowledge/templates", destination: "/knowledge/wiki/templates", permanent: false },
      // Data export lives at /settings/data-hub (P3-data-hub-route-404).
      { source: "/hr/data-hub", destination: "/settings/data-hub", permanent: false },
      { source: "/data-hub", destination: "/settings/data-hub", permanent: false },
      // The sidebar calls it Data Export (P3-settings-data-export-route-404).
      { source: "/settings/data-export", destination: "/settings/data-hub", permanent: false },
      // QR codes are a tool, not a settings page.
      { source: "/settings/qr-codes", destination: "/tools/qr-code", permanent: false },
      // Profile is a section of account settings.
      { source: "/settings/profile", destination: "/settings#profile", permanent: false },
      // System health / admin summary lives under the dashboard.
      { source: "/settings/system-health", destination: "/dashboard/admin-health", permanent: false },
      { source: "/health", destination: "/dashboard/admin-health", permanent: false },
      // Analytics is HR Analytics; reports are at /reports.
      { source: "/analytics", destination: "/hr/analytics", permanent: false },
      { source: "/audit", destination: "/settings/audit-log", permanent: false },
      { source: "/settings/audit", destination: "/settings/audit-log", permanent: false },
      { source: "/hr/org", destination: "/hr/org-chart", permanent: false },
      { source: "/org-chart", destination: "/hr/org-chart", permanent: false },
      // Offboarding is split into Exit and Termination; Exit is the lifecycle entry.
      { source: "/hr/offboarding", destination: "/hr/exit", permanent: false },
      // Team monitor is a tab of /hr/attendance; /hr/team-schedule is the dashboard's Team schedule.
      { source: "/hr/attendance/team", destination: "/hr/attendance?tab=team", permanent: false },
      { source: "/hr/team-schedule", destination: "/hr/attendance", permanent: false },
      // New hires are created in the onboarding wizard.
      { source: "/hr/employees/new", destination: "/hr/onboarding", permanent: false },
      { source: "/hr/find-expert", destination: "/hr/employees/find-expert", permanent: false },
      // Sidebar labels are Doc Types / Doc Review.
      { source: "/hr/doc-types", destination: "/hr/document-types", permanent: false },
      { source: "/hr/doc-review", destination: "/hr/document-review", permanent: false },
      { source: "/documents/review", destination: "/hr/document-review", permanent: false },
      // Career growth pages are /hr/career-*.
      { source: "/hr/promotions", destination: "/hr/career-promotions", permanent: false },
      { source: "/performance/promotions", destination: "/hr/career-promotions", permanent: false },
      { source: "/performance/career-ladders", destination: "/hr/career-ladders", permanent: false },
      { source: "/hr/evaluations", destination: "/hr/career-evaluations", permanent: false },
      // /projects/allocation used to render a soft 404 as a project id.
      { source: "/roadmap", destination: "/projects/roadmap", permanent: false },
      { source: "/resource-allocation", destination: "/projects/resource-allocation", permanent: false },
      { source: "/projects/allocation", destination: "/projects/resource-allocation", permanent: false },
      // Leave types and policies are edited at /hr/leaves/policies.
      { source: "/hr/leave-types", destination: "/hr/leaves/policies", permanent: false },
      { source: "/hr/leave-policies", destination: "/hr/leaves/policies", permanent: false },
      { source: "/hr/policies", destination: "/hr/leaves/policies", permanent: false },
      { source: "/settings/leave", destination: "/hr/leaves/policies", permanent: false },
      { source: "/settings/leave-policies", destination: "/hr/leaves/policies", permanent: false },
      // Bare /tickets is the support inbox; /tickets/<key> stays the ticket page.
      { source: "/tickets", destination: "/support/inbox", permanent: false },
      { source: "/settings/permission-matrix", destination: "/settings/permissions", permanent: false },
      { source: "/permission-matrix", destination: "/settings/permissions", permanent: false },
      { source: "/permissions", destination: "/settings/permissions", permanent: false },
      { source: "/hr/permissions", destination: "/settings/permissions", permanent: false },
      { source: "/settings/offer-letter-templates", destination: "/hr/offer-letter-templates", permanent: false },
      { source: "/settings/offer-letters", destination: "/hr/offer-letter-templates", permanent: false },
      // Payslips are /hr/my-payslips (FIX-QUEUE blank pages).
      { source: "/hr/payslips", destination: "/hr/my-payslips", permanent: false },
      { source: "/payslips", destination: "/hr/my-payslips", permanent: false },
      { source: "/profile/payslips", destination: "/hr/my-payslips", permanent: false },
      { source: "/templates", destination: "/projects/templates", permanent: false },
      { source: "/hr/templates", destination: "/projects/templates", permanent: false },
      { source: "/settings/templates", destination: "/projects/templates", permanent: false },
      { source: "/project-templates", destination: "/projects/templates", permanent: false },
      { source: "/bonuses", destination: "/hr/bonuses", permanent: false },
      { source: "/recognition", destination: "/hr/recognition", permanent: false },
      { source: "/hr/kudos", destination: "/hr/recognition", permanent: false },
      // --- end QA cluster C ---
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
