import { describe, expect, it } from "vitest";
import { countDepartments, departmentKey, NO_DEPARTMENT } from "./department-count";

describe("countDepartments (QA-BUG-14)", () => {
  it("counts distinct names and skips people without a department", () => {
    expect(countDepartments(["Design", "design ", "QA  Dept", "qa dept", null, undefined, NO_DEPARTMENT])).toBe(2);
  });

  it("normalises keys", () => {
    expect(departmentKey("  QA3 Race   Dept ")).toBe("qa3 race dept");
  });
});
