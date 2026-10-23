import { describe, expect, it } from "vitest";
import { auditActionLabel } from "./audit-action-label";

describe("R2-SYS-04: audit action labels", () => {
  it("turns stored codes into readable labels", () => {
    expect(auditActionLabel("hr.leave_cancelled")).toBe("Leave cancelled");
    expect(auditActionLabel("org.member_role_changed")).toBe("Member role changed");
    expect(auditActionLabel("kb.page.created")).toBe("Page created");
    expect(auditActionLabel("user.login")).toBe("User login");
    expect(auditActionLabel("CANDIDATE_STAGE_CHANGED")).toBe("Candidate stage changed");
  });
});
