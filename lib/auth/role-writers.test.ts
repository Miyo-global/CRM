import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * SEC-0001 / SEC-0002: every place that writes a system role onto a user or
 * an org membership must go through checkRoleAssignment, so HR cannot grant
 * CEO/ADMIN through a forgotten path.
 */
describe("system role writers", () => {
  it("all call checkRoleAssignment", () => {
    const files = execSync(
      "grep -rlE 'role: (data|input|body)\\.role|\\.set\\(\\{ ?role' app server lib --include=*.ts || true",
      { encoding: "utf-8" },
    )
      .split("\n")
      .filter((f) => f && !f.endsWith(".test.ts"));
    // Project roles and the permission matrix are not system roles. Neither is
    // a KB space seat (KB-0037): kb_space_members.role names the role a seat is
    // granted *to*, which widens access inside one space; it never writes a
    // system role onto a user or a membership.
    const notSystemRoles = [
      "app/api/projects/",
      "app/api/rbac/role-permissions/",
      "app/api/knowledge/spaces/",
    ];
    const offenders = files.filter(
      (f) =>
        !notSystemRoles.some((p) => f.startsWith(p)) &&
        !readFileSync(f, "utf-8").includes("checkRoleAssignment") &&
        !readFileSync(f, "utf-8").includes("createOrgInvitation"),
    );
    expect(offenders).toEqual([]);
  });
});
