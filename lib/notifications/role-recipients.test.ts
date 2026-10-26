import { describe, expect, it } from "vitest";
import { roleRecipients } from "./role-recipients";

const members = [
  { userId: "ceo", role: "CEO" },
  { userId: "hr-actor", role: "HR" },
  { userId: "hr-new", role: "HR" },
  { userId: "emp", role: "EMPLOYEE" },
];

describe("roleRecipients", () => {
  it("skips the actor and the new HR hire (FR1-027)", () => {
    expect(roleRecipients(members, ["CEO", "HR"], ["hr-actor", "hr-new"]).map((m) => m.userId)).toEqual(["ceo"]);
  });

  it("still accepts a single excluded id", () => {
    expect(roleRecipients(members, ["HR"], "hr-actor").map((m) => m.userId)).toEqual(["hr-new"]);
  });
});
