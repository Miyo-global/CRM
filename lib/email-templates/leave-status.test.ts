import { describe, expect, it } from "vitest";
import { getLeaveStatusUpdateEmailTemplate, leaveStatusSubject } from "./hr";

describe("leave decision email", () => {
  it("uses a calm subject naming the date range", () => {
    expect(leaveStatusSubject("APPROVED", "20 Oct 2026", "22 Oct 2026")).toBe(
      "Leave approved: 20 Oct 2026 to 22 Oct 2026",
    );
    expect(leaveStatusSubject("REJECTED", "20 Oct 2026", "20 Oct 2026")).toBe(
      "Leave not approved: 20 Oct 2026",
    );
  });

  it("links to the portal and shows the balance left", () => {
    const html = getLeaveStatusUpdateEmailTemplate(
      "Qa Alpha",
      "Sick Leave",
      "20 Oct 2026",
      "21 Oct 2026",
      "APPROVED",
      "HR",
      undefined,
      4,
    );
    expect(html).toMatch(/\/hr\/leaves"/);
    expect(html).toMatch(/balance remaining/);
    expect(html).toMatch(/4 days/);
    expect(html).not.toMatch(/>APPROVED</);
  });
});
