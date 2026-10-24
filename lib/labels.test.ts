import { describe, expect, it } from "vitest";
import { resignationStatusEnum, terminationStatusEnum, ticketStatusEnum } from "@/lib/db/schema/enums";
import { PERMISSIONS, ROLE_DEFAULT_PERMISSIONS, SYSTEM_ROLES } from "@/lib/rbac/permissions";
import {
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
