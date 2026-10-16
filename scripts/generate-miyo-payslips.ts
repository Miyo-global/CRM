import fs from "fs/promises";
import os from "os";
import path from "path";
import type { z } from "zod";
import { generatePayslipPdf } from "@/lib/payslip-pdf-core";
import {
  manualPayslipBodyToPdfData,
  manualPayslipPdfBodySchema,
} from "@/lib/hr/manual-payslip-pdf";
import { roundInr, splitMonthlyCtc505025 } from "@/lib/hr/payroll-calculations";

type ManualPayslipPdfInput = z.input<typeof manualPayslipPdfBodySchema>;

const ORG = {
  orgName: "MIYO Global",
  orgShortName: "MIYO Global",
} as const;

const MONTH = "2026-08";
const OUT_ROOT = path.join(os.homedir(), "Desktop");

type SheetRow = {
  folder: string;
  employeeName: string;
  designation?: string;
  employeeId: string;
  panNumber: string;
  bankName: string;
  bankAccountDisplay: string;
  ifsc: string;
  bankBranch?: string;
  joiningDateDisplay: string;
  monthlyCtc: number;
  professionalTax: number;
  leaveDaysInMonth: number;
  lopDays: number;
  overtimeAmount?: number;
  overtimeDays?: number;
  months?: { month: string; leaveDaysInMonth: number; lopDays?: number }[];
};

const employees: SheetRow[] = [
  {
    folder: "tarun",
    employeeName: "Tarun Chintakunta",
    designation: "Software Developer",
    employeeId: "PL26006",
    panNumber: "CPEPC6682M",
    bankName: "HDFC",
    bankAccountDisplay: "50100757343315",
    ifsc: "HDFC0001629",
    bankBranch: "Shaikpet",
    joiningDateDisplay: "01-04-2026",
    monthlyCtc: 28350,
    professionalTax: 200,
    leaveDaysInMonth: 1,
    lopDays: 0,
  },
  {
    folder: "rushmitha",
    employeeName: "Rushmitha Maram",
    designation: "Graphic Designer",
    employeeId: "PL26007",
    panNumber: "GQMPR1483L",
    bankName: "SBI",
    bankAccountDisplay: "38525157342",
    ifsc: "SBIN0014379",
    bankBranch: "Velugodu",
    joiningDateDisplay: "01-04-2026",
    monthlyCtc: 18900,
    professionalTax: 200,
    leaveDaysInMonth: 1,
    lopDays: 0,
  },
  {
    folder: "dheeraj",
    employeeName: "Deeraj",
    designation: "Digital Marketing Manager",
    employeeId: "PL26005",
    panNumber: "KAJPK5670M",
    bankName: "RBL",
    bankAccountDisplay: "309028363970",
    ifsc: "RATN0000208",
    bankBranch: "Kukatpally",
    joiningDateDisplay: "01-04-2026",
    monthlyCtc: 20000,
    professionalTax: 200,
    leaveDaysInMonth: 3,
    lopDays: 1,
  },
  {
    folder: "ram",
    employeeName: "Udegea Rama Krishna",
    designation: "Senior Video Editor",
    employeeId: "PL26008",
    panNumber: "AIXPU4652K",
    bankName: "SBI",
    bankAccountDisplay: "62450927654",
    ifsc: "SBIN0020160",
    bankBranch: "Kothagudem",
    joiningDateDisplay: "01-04-2026",
    monthlyCtc: 45000,
    professionalTax: 200,
    leaveDaysInMonth: 2,
    lopDays: 0,
    months: [
      { month: "2026-03", leaveDaysInMonth: 0 },
      { month: "2026-04", leaveDaysInMonth: 1 },
      { month: "2026-05", leaveDaysInMonth: 1 },
      { month: "2026-06", leaveDaysInMonth: 1 },
      { month: "2026-07", leaveDaysInMonth: 1 },
      { month: "2026-08", leaveDaysInMonth: 2 },
    ],
  },
  {
    folder: "pavan",
    employeeName: "Paturi Pavan Kumar",
    designation: "Video Editing Intern",
    employeeId: "PL26009",
    panNumber: "LTJPK5111R",
    bankName: "SBI",
    bankAccountDisplay: "40853079573",
    ifsc: "SBIN0004347",
    bankBranch: "Vanasthalipuram",
    joiningDateDisplay: "01-04-2026",
    monthlyCtc: 10000,
    professionalTax: 150,
    leaveDaysInMonth: 0,
    lopDays: 0,
  },
  {
    folder: "shreya",
    employeeName: "Shreya",
    designation: "HR Executive",
    employeeId: "PL26004",
    panNumber: "MVIPS9103F",
    bankName: "HDFC",
    bankAccountDisplay: "50100543354739",
    ifsc: "HDFC0009609",
    bankBranch: "Bandlaguda",
    joiningDateDisplay: "15-06-2026",
    monthlyCtc: 25000,
    professionalTax: 200,
    leaveDaysInMonth: 1,
    lopDays: 0,
  },
  {
    folder: "sindoori",
    employeeName: "Sindoori",
    employeeId: "PL26010",
    panNumber: "BZMPP0877J",
    bankName: "HDFC",
    bankAccountDisplay: "50100890327072",
    ifsc: "HDFC0007602",
    joiningDateDisplay: "29-07-2026",
    monthlyCtc: 33200,
    professionalTax: 200,
    leaveDaysInMonth: 1,
    lopDays: 0,
    overtimeAmount: 2142,
    overtimeDays: 2,
  },
];

async function main() {
  const onlyFolders = process.argv.slice(2).filter(Boolean);
  const rows = onlyFolders.length
    ? employees.filter((e) => onlyFolders.includes(e.folder) || onlyFolders.includes(e.employeeId))
    : employees;

  for (const emp of rows) {
    const monthRuns = emp.months?.length
      ? emp.months
      : [{ month: MONTH, leaveDaysInMonth: emp.leaveDaysInMonth, lopDays: emp.lopDays }];

    for (const run of monthRuns) {
      const split = splitMonthlyCtc505025(emp.monthlyCtc);
      const ot = emp.overtimeAmount ?? 0;
      const lopDays = run.lopDays ?? 0;
      const [year, monthNum] = run.month.split("-").map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const lopDeductionAmount =
        lopDays > 0 ? roundInr((emp.monthlyCtc / daysInMonth) * lopDays) : 0;
      const gross = roundInr(emp.monthlyCtc) + ot;
      const deductions = emp.professionalTax + lopDeductionAmount;
      const net = gross - deductions;

      const body = manualPayslipPdfBodySchema.parse({
        ...ORG,
        month: run.month,
        employeeName: emp.employeeName,
        designation: emp.designation,
        employeeId: emp.employeeId,
        panNumber: emp.panNumber,
        bankName: emp.bankName,
        bankAccountDisplay: emp.bankAccountDisplay,
        ifsc: emp.ifsc,
        bankBranch: emp.bankBranch,
        joiningDateDisplay: emp.joiningDateDisplay,
        basicSalary: split.basicSalary,
        hra: split.hra,
        allowances: split.specialAllowance,
        overtimeAmount: ot,
        overtimeType: ot > 0 ? ("days" as const) : undefined,
        overtimeDays: emp.overtimeDays,
        professionalTax: emp.professionalTax,
        leaveDaysInMonth: run.leaveDaysInMonth,
        lopDays,
        lopDeductionAmount,
        grossSalary: gross,
        deductions,
        netSalary: net,
        showPaidBadge: true,
      } satisfies ManualPayslipPdfInput);

      const buffer = await generatePayslipPdf(manualPayslipBodyToPdfData(body));
      const filename = `Payslip-${emp.employeeName.replace(/\s+/g, "-")}-${run.month}.pdf`;
      const filepath = path.join(OUT_ROOT, filename);
      await fs.writeFile(filepath, buffer);
      console.log(
        `${emp.employeeId} ${emp.employeeName} ${run.month}: gross ${gross} lop ${lopDeductionAmount} pt ${emp.professionalTax} net ${net} → ${filepath}`
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
