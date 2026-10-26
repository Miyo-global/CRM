import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getNavGroupsForRole } from "@/components/layout/sidebar/sidebar-nav-items";
import { ROLES } from "@/lib/constants/roles";
import { ROLE_DEFAULT_PERMISSIONS, SYSTEM_ROLES } from "@/lib/rbac/permissions";
import { canGrantRole } from "@/lib/auth/role-change-rules";

// Owner decision: Miyo Global has no sales features (sales role, leads, deals,
// campaigns, incentives, sales AI). This keeps them from coming back.
const ROOT = join(__dirname, "..");

describe("no sales features", () => {
  it("has no Sales or Digital Marketing role", () => {
    expect(SYSTEM_ROLES).not.toContain("SALES");
    expect(SYSTEM_ROLES).not.toContain("DIGITAL_MARKETING");
    expect(Object.values(ROLES)).not.toContain("SALES");
    expect(ROLE_DEFAULT_PERMISSIONS).not.toHaveProperty("SALES");
    expect(canGrantRole("CEO", "SALES")).toBe(false);
    expect(canGrantRole("CEO", "DIGITAL_MARKETING")).toBe(false);
  });

  it.each([
    "app/api/ai/score-lead",
    "app/api/ai/enrich-lead",
    "app/api/ai/predict-deal",
    "app/api/ai/objection-handler",
    "app/api/ai/subject-lines",
    "app/api/ai/content-brief",
    "app/api/projects/from-deal",
    "app/api/hr/incentives",
    "app/(dashboard)/hr/incentives",
    "app/(dashboard)/settings/custom-fields",
    "server/queries/crm-deals.ts",
    "server/queries/leads.ts",
    "server/queries/sales-dashboard.ts",
  ])("%s is gone", (path) => {
    expect(existsSync(join(ROOT, path))).toBe(false);
  });

  it("offers no sales page in any role's menu", () => {
    const salesHref = /\/(crm|leads|deals|campaigns|incentives|sales)\b|custom-fields/;
    for (const role of SYSTEM_ROLES) {
      const hrefs = getNavGroupsForRole(role).flatMap((g) => g.routes.map((r) => r.href));
      expect(hrefs.filter((href) => salesHref.test(href)), role).toEqual([]);
    }
  });
});
