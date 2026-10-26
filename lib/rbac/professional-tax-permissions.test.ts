import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS } from "./permissions";
import { permissionForRoute } from "./route-permissions";
import { canEditOwnProfessionalTax } from "@/lib/constants/roles";

const PT = ["hr:payroll:pt:view", "hr:payroll:pt:edit"];

describe("professional tax permissions", () => {
  it("are listed for the Roles page", () => {
    for (const name of PT) expect(PERMISSIONS.map((p) => p.name)).toContain(name);
  });

  it.each(["CEO", "ADMIN", "HR"])("%s holds both by default", (role) => {
    for (const name of PT) expect(ROLE_DEFAULT_PERMISSIONS[role]).toContain(name);
  });

  it.each(["EMPLOYEE", "RECRUITER", "SALES", "ENGINEERING"])("%s holds neither", (role) => {
    for (const name of PT) expect(ROLE_DEFAULT_PERMISSIONS[role] ?? []).not.toContain(name);
  });

  it("guards the PT route by method", () => {
    const path = "/api/hr/salary-structures/u1/professional-tax";
    expect(permissionForRoute(path, "GET")).toBe("hr:payroll:pt:view");
    expect(permissionForRoute(path, "PATCH")).toBe("hr:payroll:pt:edit");
  });

  it("only the Super Admin edits their own PT", () => {
    expect(canEditOwnProfessionalTax("CEO")).toBe(true);
    for (const role of ["ADMIN", "HR", "EMPLOYEE", null]) expect(canEditOwnProfessionalTax(role)).toBe(false);
  });
});
