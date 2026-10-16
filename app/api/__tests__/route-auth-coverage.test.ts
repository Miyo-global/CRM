import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const API_ROOT = path.resolve(__dirname, "..");

const AUTH_GUARD = /\b(withAuth|withAdmin|withRoles|withHrEmailTemplateAccess|verifyCronSecret|requirePermission|hasAnyPermission)\b|\bauth\(\)/;

const PUBLIC_ROUTES: Record<string, string> = {
  "auth/[...nextauth]/route.ts": "NextAuth handler",
  "auth/signup/route.ts": "public sign-up, gated by NEXT_PUBLIC_SIGNUP_ENABLED",
  "auth/forgot-password/route.ts": "pre-login flow",
  "auth/reset-password/route.ts": "token-verified reset",
  "auth/verify-email/route.ts": "token-verified email check",
  "auth/resend-verification/route.ts": "pre-login flow",
  "auth/accept-invitation/route.ts": "token-verified invitation",
  "auth/invitation/route.ts": "token-verified invitation lookup",
  "auth/validate-setup-token/route.ts": "token-verified setup",
  "health/route.ts": "health probe",
  "inngest/route.ts": "Inngest serve() verifies its signing key",
  "public/intake/[token]/route.ts": "public project intake form",
  "push/vapid-public-key/route.ts": "public VAPID key",
  "hr/integrations/biometric/route.ts": "x-api-key header",
  "webhooks/esign/route.ts": "HMAC signature",
};

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

const routes = routeFiles(API_ROOT).map((f) => path.relative(API_ROOT, f).split(path.sep).join("/"));

describe("API route auth coverage", () => {
  it("finds the API routes", () => {
    expect(routes.length).toBeGreaterThan(400);
  });

  it("every route calls an auth guard or is an allowlisted public route", () => {
    const unguarded = routes.filter(
      (r) => !PUBLIC_ROUTES[r] && !AUTH_GUARD.test(readFileSync(path.join(API_ROOT, r), "utf8")),
    );
    expect(unguarded).toEqual([]);
  });

  it("every allowlisted public route still exists", () => {
    const missing = Object.keys(PUBLIC_ROUTES).filter((r) => !routes.includes(r));
    expect(missing).toEqual([]);
  });
});
