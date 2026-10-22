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
});
