import { describe, expect, it } from "vitest";
import { resolveWorkLogView } from "./work-log-view";

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
