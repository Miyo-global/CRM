import { describe, expect, it } from "vitest";
import {
  ackStatusEnum,
  leaveStatusEnum,
  payrollStatusEnum,
  pipProgressStatusEnum,
  pipStatusEnum,
  reimbursementStatusEnum,
  resignationStatusEnum,
  terminationStatusEnum,
  ticketStatusEnum,
  wfhRequestStatusEnum,
} from "@/lib/db/schema/enums";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, SYSTEM_ROLES } from "@/lib/rbac/permissions";
import {
  ACK_STATUS_LABELS,
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_LABELS,
  HANDBOOK_STATUSES,
  HANDBOOK_STATUS_LABELS,
  LEAVE_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
  PIP_PROGRESS_STATUS_LABELS,
  PIP_STATUS_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
  attendanceStatusLabel,
  payrollStatusLabel,
  PERMISSION_GROUP_LABELS,
  RESIGNATION_STATUSES,
  RESIGNATION_STATUS_LABELS,
  ROLE_LABELS,
  TERMINATION_STATUS_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  auditTargetTypeLabel,
  permissionGroupLabel,
  resignationStatusLabel,
  ticketStatusLabel,
} from "@/lib/labels";

const RAW = /^[A-Z_]+$/;

describe("R3-LBL-01 label maps", () => {
  it.each([
    ["resignation", resignationStatusEnum.enumValues, RESIGNATION_STATUS_LABELS],
    ["termination", terminationStatusEnum.enumValues, TERMINATION_STATUS_LABELS],
    ["ticket", ticketStatusEnum.enumValues, TICKET_STATUS_LABELS],
    ["payroll", payrollStatusEnum.enumValues, PAYROLL_STATUS_LABELS],
    ["leave", leaveStatusEnum.enumValues, LEAVE_STATUS_LABELS],
    ["reimbursement", reimbursementStatusEnum.enumValues, REIMBURSEMENT_STATUS_LABELS],
    ["acknowledgement", ackStatusEnum.enumValues, ACK_STATUS_LABELS],
    ["PIP", pipStatusEnum.enumValues, PIP_STATUS_LABELS],
    ["PIP progress", pipProgressStatusEnum.enumValues, PIP_PROGRESS_STATUS_LABELS],
    ["handbook", HANDBOOK_STATUSES, HANDBOOK_STATUS_LABELS],
    ["attendance", ATTENDANCE_STATUSES, ATTENDANCE_STATUS_LABELS],
  ] as const)("every %s status has a human label", (_name, values, labels) => {
    expect(Object.keys(labels).sort()).toEqual([...values].sort());
    for (const v of values) {
      const label = (labels as Record<string, string>)[v];
      expect(label, v).toBeTruthy();
      expect(label, v).not.toMatch(RAW);
      expect(label, v).not.toMatch(/CEO/);
    }
  });

  it("the local status lists mirror the DB enums", () => {
    expect([...RESIGNATION_STATUSES]).toEqual(resignationStatusEnum.enumValues);
    expect([...TICKET_STATUSES]).toEqual(ticketStatusEnum.enumValues);
  });

  it("WFH statuses are covered by the leave labels", () => {
    for (const v of wfhRequestStatusEnum.enumValues) expect(LEAVE_STATUS_LABELS[v]).toBeTruthy();
  });

  it("names HR statuses, falling back to words for unknown values", () => {
    expect(payrollStatusLabel("PENDING_APPROVAL")).toBe("Pending approval");
    expect(payrollStatusLabel(null)).toBe("Draft");
    expect(attendanceStatusLabel("CHECKED_OUT")).toBe("Checked out");
    expect(attendanceStatusLabel("EARLY_EXIT")).toBe("Early exit");
  });

  it("every role has a label and CEO reads as Super Admin", () => {
    for (const role of SYSTEM_ROLES) expect(ROLE_LABELS[role]).toBeTruthy();
    expect(ROLE_LABELS.CEO).toBe("Super Admin");
  });

  it("names resignation and ticket statuses, never echoing the raw value", () => {
    expect(resignationStatusLabel("PENDING_HR")).toBe("Pending HR review");
    expect(resignationStatusLabel("CEO_APPROVED")).not.toMatch(/CEO/);
    expect(ticketStatusLabel("TODO")).toBe("To Do");
    expect(ticketStatusLabel(null)).toBe("To Do");
    expect(ticketStatusLabel("SOMETHING_NEW")).toBe("Something new");
  });

  it("every permission group in the catalogue has one spelling", () => {
    for (const { resource } of PERMISSIONS) {
      expect(PERMISSION_GROUP_LABELS[resource], resource).toBeTruthy();
      expect(permissionGroupLabel(resource)).not.toMatch(/ - |:/);
    }
  });

  it("audit target types are worded; ids are left alone", () => {
    expect(auditTargetTypeLabel("termination_reason")).toBe("Termination reason");
    expect(auditTargetTypeLabel("employee")).toBe("Employee");
  });
});

describe("R3-INV-01 ATS permissions while the ATS is off", () => {
  it("are not in the catalogue or any role default", () => {
    expect(PERMISSIONS.some((p) => p.name.startsWith("ats:"))).toBe(false);
    for (const [role, perms] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
      expect(perms.filter((p) => p.startsWith("ats:")), role).toEqual([]);
    }
  });
});
