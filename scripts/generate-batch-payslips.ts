import fs from "fs/promises";
import path from "path";
import type { z } from "zod";
import { generatePayslipPdf } from "@/lib/payslip-pdf-core";
import {
  manualPayslipBodyToPdfData,
  manualPayslipPdfBodySchema,
} from "@/lib/hr/manual-payslip-pdf";

type ManualPayslipPdfInput = z.input<typeof manualPayslipPdfBodySchema>;
type EmployeeInput = Omit<ManualPayslipPdfInput, "grossSalary" | "deductions" | "netSalary"> & {
  grossSalary?: number;
  deductions?: number;
  netSalary?: number;
};

const ORG = {
  orgName: "Miyo Global",
  orgShortName: "Miyo Global",
  orgAddress: "Hyderabad, Telangana, India",
};

const employees: EmployeeInput[] = [
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Sruthi Dharmavaram",
    designation: "HR Manager",
    employeeId: "VC25003",
    panNumber: "BXZPD3313C",
    bankName: "IDFC",
    bankAccountDisplay: "10227453664",
    ifsc: "IDFB0080233",
    bankBranch: "Gacchibowli",
    joiningDateDisplay: "01-11-2025",
    basicSalary: 20000,
    hra: 10000,
    allowances: 10000,
    professionalTax: 200,
    lopDays: 0,
    leaveDaysInMonth: 1,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Swetha Undurthi",
    designation: "HR Executive",
    employeeId: "VC25004",
    panNumber: "MYRPS2738C",
    bankName: "HDFC",
    bankAccountDisplay: "50100618482465",
    ifsc: "HDFC0006707",
    bankBranch: "Phoenix Avance",
    joiningDateDisplay: "02-12-2025",
    basicSalary: 13500,
    hra: 6750,
    allowances: 6750,
    professionalTax: 200,
    lopDays: 0,
    leaveDaysInMonth: 2,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Chintakunta Tarun",
    designation: "Software Developer",
    employeeId: "VC25005",
    panNumber: "CPEPC6682M",
    bankName: "HDFC",
    bankAccountDisplay: "50100757343315",
    ifsc: "HDFC0001629",
    bankBranch: "Shaikpet",
    joiningDateDisplay: "08-12-2025",
    basicSalary: 13500,
    hra: 6750,
    allowances: 6750,
    professionalTax: 200,
    lopDays: 0,
    leaveDaysInMonth: 1,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Maram Rushmitha",
    designation: "Graphic Designer",
    employeeId: "VC25006",
    panNumber: "GQMPR1483L",
    bankName: "SBI",
    bankAccountDisplay: "38525157342",
    ifsc: "SBIN0014379",
    bankBranch: "Velugodu",
    joiningDateDisplay: "15-12-2025",
    basicSalary: 9000,
    hra: 4500,
    allowances: 4500,
    professionalTax: 200,
    lopDays: 0,
    leaveDaysInMonth: 1,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Mohammed Sameer",
    designation: "Sales Executive",
    employeeId: "VC26009",
    panNumber: "UBAPS7864D",
    bankName: "SBI",
    bankAccountDisplay: "44366888333",
    ifsc: "SBIN0013331",
    bankBranch: "Warangal",
    joiningDateDisplay: "02-01-2026",
    basicSalary: 10000,
    hra: 5000,
    allowances: 5000,
    professionalTax: 200,
    lopDays: 0,
    leaveDaysInMonth: 0,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "K Deeraj Kiran",
    designation: "Digital Marketing Manager",
    employeeId: "VC26010",
    panNumber: "KAJPK5670M",
    bankName: "RBL",
    bankAccountDisplay: "309028363970",
    ifsc: "RATN0000208",
    bankBranch: "Kukatpally",
    joiningDateDisplay: "22-01-2026",
    basicSalary: 10000,
    hra: 5000,
    allowances: 5000,
    professionalTax: 200,
    lopDays: 1,
    lopDeductionAmount: 667,
    leaveDaysInMonth: 3,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Pujitha Meenugu",
    designation: "Customer Support Executive",
    employeeId: "VC26013",
    panNumber: "EXRPM7036N",
    bankName: "HDFC",
    bankAccountDisplay: "50100839777740",
    ifsc: "HDFC0000042",
    bankBranch: "Secunderabad",
    joiningDateDisplay: "19-01-2026",
    basicSalary: 11000,
    hra: 5500,
    allowances: 5500,
    professionalTax: 200,
    lopDays: 0,
    leaveDaysInMonth: 2,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Rama Krishna Udegea",
    designation: "Senior Video Editor",
    employeeId: "VC26016",
    panNumber: "AIXPU4652K",
    bankName: "SBI",
    bankAccountDisplay: "62450927654",
    ifsc: "SBIN0020160",
    bankBranch: "Kothagudem",
    joiningDateDisplay: "16-02-2026",
    basicSalary: 22500,
    hra: 11250,
    allowances: 11250,
    professionalTax: 200,
    lopDays: 0,
    leaveDaysInMonth: 1,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Madhusudhan Poosa",
    designation: "Sr. Wealth Relationship Manager",
    employeeId: "VC26018",
    panNumber: "BQCPM1741F",
    bankName: "SBI",
    bankAccountDisplay: "62201626290",
    ifsc: "SBIN0020848",
    bankBranch: "Uppal",
    joiningDateDisplay: "17-02-2026",
    basicSalary: 16500,
    hra: 8250,
    allowances: 8250,
    professionalTax: 200,
    lopDays: 15,
    lopDeductionAmount: 16500,
    leaveDaysInMonth: 5,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Prajit Gaddam",
    designation: "Manual Tester Intern",
    employeeId: "VC26021",
    panNumber: "LDEPK8663F",
    bankName: "HDFC",
    bankAccountDisplay: "50100586750592",
    ifsc: "HDFC0004741",
    bankBranch: "Nagole",
    joiningDateDisplay: "16-03-2026",
    basicSalary: 4000,
    hra: 2000,
    allowances: 2000,
    professionalTax: 200,
    lopDays: 0,
    leaveDaysInMonth: 0,
    showPaidBadge: true,
  },
  {
    ...ORG,
    month: "2026-04",
    employeeName: "Pavan Kumar",
    designation: "Video Editing Intern",
    employeeId: "VC26022",
    panNumber: "LTJPK5111R",
    bankName: "SBI",
    bankAccountDisplay: "40853079573",
    ifsc: "SBIN0004347",
    bankBranch: "Vanasthalipuram",
    joiningDateDisplay: "08-04-2026",
    basicSalary: 4000,
    hra: 2000,
    allowances: 2000,
    professionalTax: 200,
    lopDays: 7,
    lopDeductionAmount: 1867,
    leaveDaysInMonth: 0,
    showPaidBadge: true,
  },
];

async function main() {
  const dir = path.join(process.cwd(), "generated", "payslips");
  await fs.mkdir(dir, { recursive: true });

  const onlyIds = process.argv.slice(2).filter(Boolean);
  const filtered = onlyIds.length > 0
    ? employees.filter((e) => e.employeeId !== undefined && onlyIds.includes(e.employeeId))
    : employees;

  for (const emp of filtered) {
    const gross = emp.basicSalary + emp.hra + (emp.allowances ?? 0) + (emp.overtimeAmount ?? 0);
    const totalDed =
      (emp.professionalTax ?? 200) +
      (emp.pfEmployee ?? 0) +
      (emp.esiEmployee ?? 0) +
      (emp.lopDeductionAmount ?? 0) +
      (emp.advanceRecoveryAmount ?? 0);
    const net = Math.max(0, gross - totalDed);

    const body = manualPayslipPdfBodySchema.parse({
      ...emp,
      grossSalary: gross,
      deductions: totalDed,
      netSalary: net,
    });

    const pdfData = manualPayslipBodyToPdfData(body);
    const buffer = await generatePayslipPdf(pdfData);

    const safeName = body.employeeName.replace(/\s+/g, "-");
    const filename = `Payslip-${safeName}-${body.month ?? "custom"}.pdf`;
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, buffer);
    console.log("Wrote", filepath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
