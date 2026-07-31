import fs from "fs/promises";
import path from "path";
import { generatePayslipPdf } from "@/lib/payslip-pdf-core";
import {
  manualPayslipBodyToPdfData,
  manualPayslipPdfBodySchema,
} from "@/lib/hr/manual-payslip-pdf";

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const basic = rnd(45_000, 95_000);
  const hra = Math.round(basic * 0.5);
  const allowances = rnd(5_000, 28_000);
  const overtime = rnd(0, 14_000);
  const gross = basic + hra + allowances + overtime;
  const pt = 200;
  const lopD = rnd(0, 9_000);
  const adv = rnd(0, 6_000);
  const other = rnd(0, 4_000);
  const deductions = pt + lopD + adv + other;
  const net = Math.max(0, gross - deductions);

  const roles = ["Analyst", "Associate", "Manager"] as const;
  const body = manualPayslipPdfBodySchema.parse({
    month: "2026-05",
    orgName: "Miyo Global",
    orgShortName: "Miyo Global",
    orgAddress: "Hyderabad, Telangana, India",
    employeeName: `Sample Employee ${rnd(100, 999)}`,
    employeeId: `DEMO-${rnd(10, 99)}`,
    designation: roles[rnd(0, roles.length - 1)],
    panNumber: "ABCDE1234F",
    bankName: "ICICI Bank",
    bankAccountDisplay: String(rnd(10_000_000_000, 99_999_999_999)),
    bankBranch: "Hyderabad",
    ifsc: "ICIC0001234",
    joiningDateDisplay: "01-06-2023",
    basicSalary: basic,
    hra,
    allowances,
    overtimeAmount: overtime,
    overtimeType: overtime > 0 ? ("days" as const) : undefined,
    overtimeDays: overtime > 0 ? rnd(1, 4) : undefined,
    lopDays: rnd(0, 2),
    leaveDaysInMonth: rnd(0, 3),
    lopDeductionAmount: lopD,
    advanceRecoveryAmount: adv,
    professionalTax: pt,
    grossSalary: gross,
    deductions,
    netSalary: net,
    showPaidBadge: true,
  });

  const pdfData = manualPayslipBodyToPdfData(body);
  const buffer = await generatePayslipPdf(pdfData);

  const dir = path.join(process.cwd(), "generated", "payslips");
  await fs.mkdir(dir, { recursive: true });
  const filename = `sample-branded-${Date.now()}.pdf`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, buffer);
  console.log("Wrote", filepath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
