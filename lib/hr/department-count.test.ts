import { describe, expect, it } from "vitest";
import { countDepartments, departmentKey, NO_DEPARTMENT, uniqueDepartmentNames } from "./department-count";

describe("countDepartments (QA-BUG-14)", () => {
  it("counts distinct names and skips people without a department", () => {
    expect(countDepartments(["Design", "design ", "QA  Dept", "qa dept", null, undefined, NO_DEPARTMENT])).toBe(2);
  });

  it("lists each department name once for the filter (QA-BUG-26)", () => {
    const rows = ["QA3 Race Dept", "QA3 Race Dept", "qa3 race dept ", "Design"].map((name) => ({ name }));
    expect(uniqueDepartmentNames(rows)).toEqual(["Design", "QA3 Race Dept"]);
  });

  it("normalises keys", () => {
    expect(departmentKey("  QA3 Race   Dept ")).toBe("qa3 race dept");
  });
});
