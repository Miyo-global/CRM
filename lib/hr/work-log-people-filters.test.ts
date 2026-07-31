import { describe, expect, it } from "vitest";
import { normalizeWorkLogPeopleFilters } from "./work-log-people-filters";

const employees = [
  { id: "emp-1", departmentId: 10 },
  { id: "emp-2", departmentId: 20 },
];

describe("normalizeWorkLogPeopleFilters", () => {
  it("keeps department and employee when they match", () => {
    expect(
      normalizeWorkLogPeopleFilters(
        { departmentId: "10", selectedUserId: "emp-1", viewAllTeam: false },
        employees,
      ),
    ).toEqual({
      departmentId: "10",
      selectedUserId: "emp-1",
      viewAllTeam: false,
    });
  });

  it("drops the employee when they are outside the selected department", () => {
    expect(
      normalizeWorkLogPeopleFilters(
        { departmentId: "10", selectedUserId: "emp-2", viewAllTeam: false },
        employees,
      ),
    ).toEqual({
      departmentId: "10",
      selectedUserId: undefined,
      viewAllTeam: true,
    });
  });

  it("uses department-only team view when no employee is selected", () => {
    expect(
      normalizeWorkLogPeopleFilters({ departmentId: "10" }, employees),
    ).toEqual({
      departmentId: "10",
      viewAllTeam: true,
    });
  });
});
