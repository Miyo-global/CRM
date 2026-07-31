"server-only";

import { db } from "@/lib/db";
import { payrolls, salaryStructures, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Payroll, PayrollWithUser, SalaryStructure, EmployeePayslip } from "@/types/hr";

export async function getPayrolls(orgId: string, userId: string): Promise<Payroll[]> {
  return db.query.payrolls.findMany({
    where: and(
      eq(payrolls.userId, userId),
      eq(payrolls.orgId, orgId)
    ),
    orderBy: [desc(payrolls.createdAt)],
  }) as unknown as Promise<Payroll[]>;
}

export async function getSalaryStructures(
  orgId: string,
  userId?: string,
  requestingUserId?: string,
  isAdmin?: boolean
): Promise<SalaryStructure[]> {
  const conditions = [eq(salaryStructures.orgId, orgId)];

  if (userId) {
    conditions.push(eq(salaryStructures.userId, userId));
  } else if (!isAdmin && requestingUserId) {
    conditions.push(eq(salaryStructures.userId, requestingUserId));
  }

  return db.query.salaryStructures.findMany({
    where: and(...conditions),
    orderBy: [desc(salaryStructures.effectiveFrom)],
  }) as unknown as Promise<SalaryStructure[]>;
}

export async function getAllPayrolls(orgId: string, month: string): Promise<PayrollWithUser[]> {
  const rows = await db
    .select({
      id: payrolls.id,
      orgId: payrolls.orgId,
      userId: payrolls.userId,
      month: payrolls.month,
      basicSalary: payrolls.basicSalary,
      hra: payrolls.hra,
      specialAllowance: payrolls.specialAllowance,
      allowances: payrolls.allowances,
      lopDays: payrolls.lopDays,
      lopAmount: payrolls.lopAmount,
      halfDays: payrolls.halfDays,
      halfDayAmount: payrolls.halfDayAmount,
      ptAmount: payrolls.ptAmount,
      otherDeductions: payrolls.otherDeductions,
      structureDeductions: payrolls.structureDeductions,
      advanceRecoveryAmount: payrolls.advanceRecoveryAmount,
      deductions: payrolls.deductions,
      grossSalary: payrolls.grossSalary,
      netSalary: payrolls.netSalary,
      status: payrolls.status,
      generatedBy: payrolls.generatedBy,
      approvedBy: payrolls.approvedBy,
      overtimeType: payrolls.overtimeType,
      overtimeDays: payrolls.overtimeDays,
      overtimeHours: payrolls.overtimeHours,
      overtimeAmount: payrolls.overtimeAmount,
      payslipUrl: payrolls.payslipUrl,
      createdAt: payrolls.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userDesignation: users.designation,
      userMonthlySalary: users.monthlySalary,
    })
    .from(payrolls)
    .innerJoin(users, eq(payrolls.userId, users.id))
    .where(and(eq(payrolls.orgId, orgId), eq(payrolls.month, month)))
    .orderBy(desc(payrolls.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    userId: r.userId,
    month: r.month,
    basicSalary: r.basicSalary,
    hra: r.hra,
    specialAllowance: r.specialAllowance,
    allowances: r.allowances,
    lopDays: r.lopDays,
    lopAmount: r.lopAmount,
    halfDays: r.halfDays,
    halfDayAmount: r.halfDayAmount,
    ptAmount: r.ptAmount,
    otherDeductions: r.otherDeductions,
    structureDeductions: r.structureDeductions,
    advanceRecoveryAmount: r.advanceRecoveryAmount,
    deductions: r.deductions,
    grossSalary: r.grossSalary,
    netSalary: r.netSalary,
    status: r.status,
    generatedBy: r.generatedBy,
    approvedBy: r.approvedBy,
    overtimeType: r.overtimeType,
    overtimeDays: r.overtimeDays,
    overtimeHours: r.overtimeHours,
    overtimeAmount: r.overtimeAmount,
    payslipUrl: r.payslipUrl,
    createdAt: r.createdAt,
    user: {
      firstName: r.userFirstName,
      lastName: r.userLastName,
      designation: r.userDesignation,
      monthlySalary: r.userMonthlySalary,
    },
  })) as PayrollWithUser[];
}

export async function getEmployeePayslips(orgId: string, userId: string): Promise<EmployeePayslip[]> {
  const rows = await db
    .select({
      id: payrolls.id,
      userId: payrolls.userId,
      month: payrolls.month,
      basicSalary: payrolls.basicSalary,
      hra: payrolls.hra,
      specialAllowance: payrolls.specialAllowance,
      allowances: payrolls.allowances,
      lopDays: payrolls.lopDays,
      lopAmount: payrolls.lopAmount,
      halfDays: payrolls.halfDays,
      halfDayAmount: payrolls.halfDayAmount,
      ptAmount: payrolls.ptAmount,
      pfEmployee: payrolls.pfEmployee,
      pfEmployer: payrolls.pfEmployer,
      esiEmployee: payrolls.esiEmployee,
      esiEmployer: payrolls.esiEmployer,
      advanceRecoveryAmount: payrolls.advanceRecoveryAmount,
      otherDeductions: payrolls.otherDeductions,
      structureDeductions: payrolls.structureDeductions,
      deductions: payrolls.deductions,
      grossSalary: payrolls.grossSalary,
      netSalary: payrolls.netSalary,
      status: payrolls.status,
      overtimeType: payrolls.overtimeType,
      overtimeDays: payrolls.overtimeDays,
      overtimeHours: payrolls.overtimeHours,
      overtimeAmount: payrolls.overtimeAmount,
    })
    .from(payrolls)
    .where(and(eq(payrolls.orgId, orgId), eq(payrolls.userId, userId)))
    .orderBy(desc(payrolls.month));

  return rows as unknown as EmployeePayslip[];
}
