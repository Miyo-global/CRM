import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, users, expenses } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const exportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  format: z.enum(["TALLY_XML", "QUICKBOOKS_CSV", "JSON"]).optional().default("JSON"),
});

export async function POST(req: NextRequest) {
  return withAdmin<unknown>(async (session) => {
    const body = exportSchema.parse(await req.json());
    const [year, monthNum] = body.month.split("-");
    const lastDay = new Date(Number(year), Number(monthNum), 0).getDate();
    const startDate = `${body.month}-01`;
    const endDate = `${body.month}-${String(lastDay).padStart(2, "0")}`;

    const [payrollData, expenseData] = await Promise.all([
      db
        .select({
          userId: payrolls.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          basicSalary: payrolls.basicSalary,
          hra: payrolls.hra,
          allowances: payrolls.allowances,
          deductions: payrolls.deductions,
          grossSalary: payrolls.grossSalary,
          netSalary: payrolls.netSalary,
        })
        .from(payrolls)
        .innerJoin(users, eq(payrolls.userId, users.id))
        .where(and(eq(payrolls.orgId, session.orgId), eq(payrolls.month, body.month))),

      db
        .select({
          userId: expenses.userId,
          category: expenses.category,
          amount: expenses.amount,
          description: expenses.description,
          expenseDate: expenses.expenseDate,
        })
        .from(expenses)
        .where(and(
          eq(expenses.orgId, session.orgId),
          eq(expenses.status, "APPROVED"),
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )),
    ]);

    if (body.format === "TALLY_XML") {
      const xml = generateTallyXml(payrollData, expenseData, body.month);
      return ok({ format: "TALLY_XML", data: xml });
    }

    if (body.format === "QUICKBOOKS_CSV") {
      const csv = generateQuickBooksCsv(payrollData, body.month);
      return ok({ format: "QUICKBOOKS_CSV", data: csv });
    }

    return ok({
      format: "JSON",
      month: body.month,
      payroll: payrollData.map((p) => ({
        employee: `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim(),
        basic: p.basicSalary,
        hra: p.hra,
        allowances: p.allowances,
        deductions: p.deductions,
        gross: p.grossSalary,
        net: p.netSalary,
      })),
      expenses: expenseData.map((e) => ({
        category: e.category,
        amount: e.amount,
        description: e.description,
        date: e.expenseDate,
      })),
    });
  });
}

function generateTallyXml(
  payroll: { firstName: string | null; lastName: string | null; grossSalary: string; netSalary: string }[],
  expenses: { category: string; amount: string }[],
  month: string
): string {
  const vouchers = payroll.map((p) => {
    const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return `<VOUCHER><DATE>${month}-28</DATE><NARRATION>Salary - ${name}</NARRATION><AMOUNT>${p.netSalary}</AMOUNT><LEDGER>Salary Payable</LEDGER></VOUCHER>`;
  }).join("\n");
  return `<?xml version="1.0"?>\n<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY>${vouchers}</BODY></ENVELOPE>`;
}

function generateQuickBooksCsv(
  payroll: { firstName: string | null; lastName: string | null; grossSalary: string; netSalary: string; deductions: string | null }[],
  month: string
): string {
  const header = "Date,Employee,Description,Debit,Credit";
  const rows = payroll.map((p) => {
    const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return `${month}-28,"${name}","Monthly Salary",${p.grossSalary},${p.netSalary}`;
  });
  return [header, ...rows].join("\n");
}
