import { describe, expect, it } from "vitest";
import { leavesProjectWithoutLead } from "./member-guard";

const members = [
  { userId: "a", role: "MANAGER" },
  { userId: "b", role: "CONTRIBUTOR" },
];

describe("leavesProjectWithoutLead", () => {
  it("blocks removing the only manager", () => {
    expect(leavesProjectWithoutLead(members, null, { userId: "a", nextRole: null })).toBe(true);
  });

  it("blocks demoting the only manager", () => {
    expect(leavesProjectWithoutLead(members, null, { userId: "a", nextRole: "VIEWER" })).toBe(true);
  });

  it("allows promoting between lead roles", () => {
    expect(leavesProjectWithoutLead(members, null, { userId: "a", nextRole: "OWNER" })).toBe(false);
  });

  it("allows removing a contributor", () => {
    expect(leavesProjectWithoutLead(members, null, { userId: "b", nextRole: null })).toBe(false);
  });

  it("allows removing a manager when another lead remains", () => {
    const two = [...members, { userId: "c", role: "owner" }];
    expect(leavesProjectWithoutLead(two, null, { userId: "a", nextRole: null })).toBe(false);
  });

  it("treats the project manager as a lead who must be reassigned first", () => {
    expect(leavesProjectWithoutLead(members, "a", { userId: "a", nextRole: "CONTRIBUTOR" })).toBe(true);
    expect(leavesProjectWithoutLead(members, "m", { userId: "a", nextRole: null })).toBe(false);
  });

  it("maps the legacy ADMIN role to a lead", () => {
    expect(leavesProjectWithoutLead([{ userId: "x", role: "ADMIN" }], null, { userId: "x", nextRole: null })).toBe(true);
  });
});
