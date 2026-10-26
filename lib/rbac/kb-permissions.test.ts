import { describe, it, expect } from "vitest";

import {
  KB_PERMISSION_NAMES,
  PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  SYSTEM_ROLES,
} from "./permissions";

const UNIVERSAL = ["kb:articles:view", "kb:spaces:view", "kb:pages:view"];

describe("kb permission catalog", () => {
  it("has all 22 kb:* permissions, each registered once", () => {
    expect(KB_PERMISSION_NAMES).toHaveLength(22);
    const inCatalog = PERMISSIONS.filter((p) => p.name.startsWith("kb:")).map((p) => p.name);
    expect(inCatalog.sort()).toEqual([...KB_PERMISSION_NAMES].sort());
  });
});

describe("kb role defaults", () => {
  it("gives every system role the universal view grants", () => {
    for (const role of SYSTEM_ROLES) {
      const granted = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
      for (const name of UNIVERSAL) {
        expect(granted, `${role} is missing ${name}`).toContain(name);
      }
    }
  });

  it("gives CUSTOMER_SUPPORT and HR every kb permission except purge", () => {
    for (const role of ["CUSTOMER_SUPPORT", "HR"]) {
      const granted = new Set(ROLE_DEFAULT_PERMISSIONS[role]);
      expect(granted.has("kb:pages:purge")).toBe(false);
      for (const name of KB_PERMISSION_NAMES.filter((n) => n !== "kb:pages:purge")) {
        expect(granted.has(name), `${role} is missing ${name}`).toBe(true);
      }
    }
  });

  it("gives CEO and ADMIN the lot, purge included", () => {
    for (const role of ["CEO", "ADMIN"]) {
      const granted = new Set(ROLE_DEFAULT_PERMISSIONS[role]);
      for (const name of KB_PERMISSION_NAMES) {
        expect(granted.has(name), `${role} is missing ${name}`).toBe(true);
      }
    }
  });

  it("does not let an employee role manage spaces or create pages org-wide", () => {
    const employee = new Set(ROLE_DEFAULT_PERMISSIONS.EMPLOYEE);
    expect(employee.has("kb:spaces:manage")).toBe(false);
    expect(employee.has("kb:pages:create")).toBe(false);
    expect(employee.has("kb:settings:manage")).toBe(false);
    expect(employee.has("kb:ai:generate")).toBe(true);
    expect(employee.has("kb:pages:export")).toBe(true);
    expect(employee.has("kb:reviews:view")).toBe(true);
  });
});
