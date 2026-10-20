import { describe, expect, it } from "vitest";
import { canSeeLeaveDetails } from "./leave-visibility";

describe("canSeeLeaveDetails (QA-AUTH-08)", () => {
  it("shows the type to the person and to approvers", () => {
    expect(canSeeLeaveDetails({ id: "e1", role: "ENGINEERING" }, "e1")).toBe(true);
    for (const role of ["HR", "ADMIN", "CEO"]) {
      expect(canSeeLeaveDetails({ id: "x", role }, "e1")).toBe(true);
    }
  });

  it("hides it from other employees", () => {
    expect(canSeeLeaveDetails({ id: "e2", role: "ENGINEERING" }, "e1")).toBe(false);
    expect(canSeeLeaveDetails({ id: null, role: null }, "e1")).toBe(false);
  });
});
