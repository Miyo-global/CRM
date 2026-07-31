"server-only";

import { db } from "@/lib/db";
import { attendance, users, departments, organizations } from "@/lib/db/schema";
import { and, eq, gte, lte, asc, inArray } from "drizzle-orm";

export interface AttendanceExportQuery {
  userIds?: string[];
  departmentIds?: number[];
  startDate: string;
  endDate: string;
}

export interface AttendanceExportRow {
  employeeName: string;
  employeeId: string | null;
  departmentName: string | null;
  role: string;
  date: string;
  status: string | null;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  workHours: string | null;
  breakHours: string | null;
  isOvertime: boolean | null;
  isHolidayWork: boolean | null;
  isSundayWork: boolean | null;
  autoCheckedOut: boolean | null;
}

function resolveName(
  firstName: string | null,
  lastName: string | null,
  name: string | null,
  email: string,
): string {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return full || name || email;
}

export async function getAttendanceExportRows(
  orgId: string,
  q: AttendanceExportQuery,
): Promise<AttendanceExportRow[]> {
  const conditions = [
    eq(attendance.orgId, orgId),
    gte(attendance.date, q.startDate),
    lte(attendance.date, q.endDate),
  ];
  if (q.userIds?.length) conditions.push(inArray(attendance.userId, q.userIds));
  if (q.departmentIds?.length) conditions.push(inArray(users.departmentId, q.departmentIds));

  const rows = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      name: users.name,
      email: users.email,
      employeeId: users.employeeId,
      role: users.role,
      departmentName: departments.name,
      date: attendance.date,
      status: attendance.status,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      workHours: attendance.workHours,
      breakHours: attendance.breakHours,
      isOvertime: attendance.isOvertime,
      isHolidayWork: attendance.isHolidayWork,
      isSundayWork: attendance.isSundayWork,
      autoCheckedOut: attendance.autoCheckedOut,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.userId, users.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(and(...conditions))
    .orderBy(asc(users.firstName), asc(users.lastName), asc(attendance.date));

  return rows.map((r) => ({
    employeeName: resolveName(r.firstName, r.lastName, r.name, r.email),
    employeeId: r.employeeId,
    departmentName: r.departmentName,
    role: r.role,
    date: r.date,
    status: r.status,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    workHours: r.workHours,
    breakHours: r.breakHours,
    isOvertime: r.isOvertime,
    isHolidayWork: r.isHolidayWork,
    isSundayWork: r.isSundayWork,
    autoCheckedOut: r.autoCheckedOut,
  }));
}

export async function getOrganizationName(orgId: string): Promise<string> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { name: true },
  });
  return org?.name ?? "Organization";
}
