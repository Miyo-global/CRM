import { describe, expect, it } from "vitest";
import { hiddenRolesHint } from "./hr";

const roles = [
  { slug: "ADMIN", name: "Admin" },
  { slug: "HR", name: "HR" },
  { slug: "EMPLOYEE", name: "Employee" },
];

describe("hiddenRolesHint (FR1-009)", () => {
  it("says HR is hidden for Engineering and how to get it", () => {
    expect(hiddenRolesHint(roles, "Engineering")).toBe(
      "HR is not offered for Engineering. To assign it, pick the matching department.",
    );
  });

  it("is silent when nothing is hidden or no department is picked", () => {
    expect(hiddenRolesHint(roles, "HR")).toBeNull();
    expect(hiddenRolesHint(roles, "")).toBeNull();
  });
});
