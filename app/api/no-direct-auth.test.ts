import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

/**
 * Routes that call auth() directly skip the deactivation and
 * session-revocation checks that live in withAuth (QA-0006). Only the Google
 * OAuth return leg may do so, and it verifies the identity itself.
 */
const ALLOWED = new Set([
  "app/api/integrations/google/callback/route.ts",
]);

describe("API routes", () => {
  it("enforce auth through withAuth/withAdmin/withRoles, not auth()", () => {
    const files = execSync("find app/api -name 'route.ts'", { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean);

    const offenders = files.filter(
      (f) => !ALLOWED.has(f) && /await auth\(\)/.test(readFileSync(f, "utf-8")),
    );

    expect(offenders).toEqual([]);
  });

  // Deny by default (V5-ARCH-001): every route goes through a with*() guard,
  // a cron secret, or is on this list of routes that are public on purpose
  // or verify the caller themselves.
  it("are guarded unless deliberately public", () => {
    const PUBLIC = new Set([
      "app/api/webhooks/esign/route.ts", // provider signature
      "app/api/push/vapid-public-key/route.ts", // public key only
      "app/api/hr/integrations/biometric/route.ts", // device API key
      "app/api/integrations/google/callback/route.ts", // OAuth state
    ]);
    const files = execSync("find app/api -name 'route.ts'", { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean);

    const unguarded = files.filter((f) => {
      if (PUBLIC.has(f) || /^app\/api\/(public|auth)\//.test(f)) return false;
      const src = readFileSync(f, "utf-8");
      if (f.startsWith("app/api/cron/")) return !src.includes("verifyCronSecret");
      return !/with[A-Z][A-Za-z]*(<[^>]*>)?\(/.test(src);
    });

    expect(unguarded).toEqual([]);
  });
});
