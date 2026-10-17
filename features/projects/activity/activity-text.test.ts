import { describe, expect, it } from "vitest";
import { actorName, describeActivity } from "./activity-text";

describe("describeActivity", () => {
  it("describes field changes with readable values", () => {
    expect(describeActivity({ action: "status_changed", field: "status", fromValue: "IN_PROGRESS", toValue: "DONE" }))
      .toBe("changed status from in progress to done");
  });

  it("reads single-word enums as words too", () => {
    expect(describeActivity({ action: "priority_changed", field: "priority", fromValue: "HIGH", toValue: "MEDIUM" }))
      .toBe("changed priority from high to medium");
    expect(describeActivity({ action: "status_changed", field: "status", fromValue: "DONE", toValue: "TODO" }))
      .toBe("changed status from done to to do");
  });

  it("describes set and cleared values", () => {
    expect(describeActivity({ action: "assignee_changed", field: "assigneeId", fromValue: null, toValue: "Asha" }))
      .toBe("set assignee to Asha");
    expect(describeActivity({ action: "due_date_changed", field: "dueDate", fromValue: "2026-10-01", toValue: null }))
      .toBe("cleared due date");
  });

  it("uses plain phrases for events", () => {
    expect(describeActivity({ action: "archived", field: null, fromValue: null, toValue: null })).toBe("archived the ticket");
  });
});

describe("actorName", () => {
  it("never shows an id", () => {
    expect(actorName(null)).toBe("Someone");
    expect(actorName({ id: "u1", name: null, firstName: "Ravi", lastName: null, image: null })).toBe("Ravi");
    expect(actorName({ id: "u1", name: "", firstName: null, lastName: null, image: null })).toBe("Someone");
  });
});
