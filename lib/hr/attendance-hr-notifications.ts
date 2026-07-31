import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";

const IST = "Asia/Kolkata";

function formatIst(d: Date): string {
  return d.toLocaleString("en-IN", {
    timeZone: IST,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function employeeLabel(name: string | null | undefined, email: string | null | undefined): string {
  return (name && name.trim()) || email || "Employee";
}

export function notifyHrEmployeeCheckIn(params: {
  orgId: string;
  employeeId: string;
  employeeName: string | null;
  employeeEmail: string | null;
  date: string;
  at: Date;
  isOrgHoliday: boolean;
  holidayName: string | null;
  isSunday: boolean;
}): void {
  const who = employeeLabel(params.employeeName, params.employeeEmail);
  const when = formatIst(params.at);
  let context = "";
  if (params.isOrgHoliday && params.holidayName) {
    context = ` Org holiday: ${params.holidayName}.`;
  } else if (params.isSunday) {
    context = " (Sunday).";
  }

  void notifyByRoles(params.orgId, [ROLES.HR], {
    type: "INFO",
    title: "Attendance — check-in",
    message: `${who} checked in on ${params.date} at ${when} (IST).${context}`,
    link: "/hr/attendance",
    metadata: {
      kind: "attendance_check_in",
      userId: params.employeeId,
      date: params.date,
      at: params.at.toISOString(),
      isOrgHoliday: params.isOrgHoliday,
      isSunday: params.isSunday,
    },
  }).catch(() => {});
}

export function notifyHrEmployeeCheckOut(params: {
  orgId: string;
  employeeId: string;
  employeeName: string | null;
  employeeEmail: string | null;
  date: string;
  at: Date;
}): void {
  const who = employeeLabel(params.employeeName, params.employeeEmail);
  const when = formatIst(params.at);

  void notifyByRoles(params.orgId, [ROLES.HR], {
    type: "INFO",
    title: "Attendance — check-out",
    message: `${who} checked out on ${params.date} at ${when} (IST).`,
    link: "/hr/attendance",
    metadata: {
      kind: "attendance_check_out",
      userId: params.employeeId,
      date: params.date,
      at: params.at.toISOString(),
    },
  }).catch(() => {});
}
