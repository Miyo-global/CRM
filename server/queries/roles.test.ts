import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { withEffectivePermissions } from "./roles";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/rbac/permissions";

const row = (slug: string, isSystem: boolean, permissions: string[]) => ({
  id: 1, name: slug, slug, orgId: "org", isSystem, permissions, createdAt: null, updatedAt: null,
});

describe("role permission counts agree (QA-ROLE-03)", () => {
  it("counts the whole live catalogue for the Super Admin, not the stored jsonb", () => {
    const ceo = withEffectivePermissions(row("CEO", true, ["crm:leads:view", "gone:forever"]));
    expect(ceo.permissions).toHaveLength(PERMISSIONS.length);
  });

  it("gives a system role its built-in defaults even when nothing is stored", () => {
    const employee = withEffectivePermissions(row("EMPLOYEE", true, []));
    expect(employee.permissions.sort()).toEqual([...new Set(ROLE_DEFAULT_PERMISSIONS.EMPLOYEE)].sort());
  });

  it("drops stored names that no longer exist", () => {
    const custom = withEffectivePermissions(row("QA_ROLE", false, ["reports:view", "not:a:permission"]));
    expect(custom.permissions).toEqual(["reports:view"]);
    expect(custom.defaultPermissions).toEqual([]);
  });
});
