import { formatDateOnlyUTC } from "@/lib/date-utils";
import { calendarDaysInMonth, roundInr } from "@/lib/hr/payroll-calculations";

export function snapSalaryEffectiveFrom(input: string | Date): string {
  const d = typeof input === "string" ? new Date(`${input.slice(0, 10)}T12:00:00.000Z`) : new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid effectiveFrom date");
  }
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (day === 1) {
    return formatDateOnlyUTC(new Date(Date.UTC(y, m, 1)));
  }
  const next = new Date(Date.UTC(y, m + 1, 1));
  return formatDateOnlyUTC(next);
}

export function dayBeforeIsoDate(yyyyMmDd: string): string {
  const d = new Date(`${yyyyMmDd.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  d.setUTCDate(d.getUTCDate() - 1);
  return formatDateOnlyUTC(d);
}

export type SalaryStructureLike = {
  effectiveFrom: string;
  effectiveTo: string | null;
  basicSalary: string;
  hraPercentage: string | null;
  specialAllowance: string | null;
};

export function pickSalaryStructureForPayrollMonth<T extends SalaryStructureLike>(
  structures: T[],
  monthYyyyMm: string
): T | null {
  const lastDay = calendarDaysInMonth(monthYyyyMm);
  const monthStart = `${monthYyyyMm}-01`;
  const monthEnd = `${monthYyyyMm}-${String(lastDay).padStart(2, "0")}`;
  const applicable = structures.filter(
    (s) =>
      s.effectiveFrom <= monthEnd &&
      (s.effectiveTo == null || s.effectiveTo === "" || s.effectiveTo >= monthStart)
  );
  if (applicable.length === 0) return null;
  return applicable.reduce((a, b) => (a.effectiveFrom >= b.effectiveFrom ? a : b));
}

export function componentsFromStructureRow(s: SalaryStructureLike): {
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  ctcMonthly: number;
} {
  const basicSalary = roundInr(parseFloat(s.basicSalary));
  const hraPct = parseFloat(s.hraPercentage ?? "50");
  const hra = roundInr((basicSalary * hraPct) / 100);
  const specialAllowance = roundInr(parseFloat(s.specialAllowance ?? "0"));
  const ctcMonthly = roundInr(basicSalary + hra + specialAllowance);
  return { basicSalary, hra, specialAllowance, ctcMonthly };
}

export function resolvePayrollMonthlyCtc(input: {
  picked: SalaryStructureLike | null;
  fallbackStructure: SalaryStructureLike | null;
  employeeMonthlySalary: number;
}): number {
  const monthly = roundInr(input.employeeMonthlySalary);
  if (input.picked) {
    const c = componentsFromStructureRow(input.picked);
    if (monthly > 0) {
      return roundInr(Math.max(c.ctcMonthly, monthly));
    }
    return c.ctcMonthly;
  }
  if (monthly > 0) {
    return monthly;
  }
  if (input.fallbackStructure) {
    return componentsFromStructureRow(input.fallbackStructure).ctcMonthly;
  }
  return 0;
}
