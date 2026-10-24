import { describe, expect, it } from "vitest";
import { logForDay, resolveWorkLogView } from "./work-log-view";

describe("resolveWorkLogView", () => {
  it("defaults HR to own editable logs", () => {
    const view = resolveWorkLogView({ role: "HR", currentUserId: "hr-1" });
    expect(view.effectiveUserId).toBe("hr-1");
    expect(view.isMultiUser).toBe(false);
    expect(view.isSelfView).toBe(true);
  });

  it("defaults CEO to team summary without own entry form", () => {
    const view = resolveWorkLogView({ role: "CEO", currentUserId: "ceo-1" });
    expect(view.effectiveUserId).toBeUndefined();
    expect(view.isMultiUser).toBe(true);
    expect(view.isSelfView).toBe(false);
  });

  it("lets HR open all-employee summary when viewAllTeam is set", () => {
    const view = resolveWorkLogView({
      role: "HR",
      currentUserId: "hr-1",
      viewAllTeam: true,
    });
    expect(view.effectiveUserId).toBeUndefined();
    expect(view.isMultiUser).toBe(true);
  });

  it("shows read-only view when HR picks another employee", () => {
    const view = resolveWorkLogView({
      role: "HR",
      currentUserId: "hr-1",
      selectedUserId: "emp-2",
    });
    expect(view.effectiveUserId).toBe("emp-2");
    expect(view.isMultiUser).toBe(false);
    expect(view.isSelfView).toBe(false);
  });
});

describe("logForDay", () => {
  const logs = [
    { id: 1, date: "2026-10-23", ticketId: 7 },
    { id: 2, date: "2026-10-24", ticketId: 7 },
    { id: 3, date: "2026-10-24", ticketId: null },
    { id: 4, date: "2026-10-24", ticketId: 8 },
  ];
  it("prefers the free-form log over ticket entries on the same day", () => {
    expect(logForDay(logs, "2026-10-24")?.id).toBe(3);
  });
  it("falls back to the first ticket entry, and undefined for an empty day", () => {
    expect(logForDay(logs, "2026-10-23")?.id).toBe(1);
    expect(logForDay(logs, "2026-10-25")).toBeUndefined();
    expect(logForDay(undefined, "2026-10-24")).toBeUndefined();
  });
});
