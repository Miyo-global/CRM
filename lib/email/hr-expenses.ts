import { sendTemplateEmail } from "./sender";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";

function money(amount: string | number): string {
  const n = typeof amount === "number" ? amount : Number(amount || 0);
  return `${CURRENCY_SYMBOL}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** MIYO-0247: the hand-written expense-submitted template. */
export async function sendExpenseSubmittedEmail(
  approverEmail: string | string[],
  claim: {
    employeeName: string;
    category: string;
    amount: string | number;
    description?: string | null;
    expenseDate: string;
    expenseId: number | string;
    hasReceipt: boolean;
  },
): Promise<void> {
  await sendTemplateEmail("expense-submitted", {
    to: approverEmail,
    category: "expenses",
    vars: {
      employee_name: claim.employeeName,
      category: claim.category,
      amount: money(claim.amount),
      description: claim.description?.trim() || "none given",
      expense_date: claim.expenseDate,
      expense_id: claim.expenseId,
      receipt_status: claim.hasReceipt ? "attached" : "not attached",
    },
  });
}

/** MIYO-0248: the hand-written expense-approved template. */
export async function sendExpenseApprovedEmail(
  employeeEmail: string,
  category: string,
  amount: string | number,
  approverName: string,
  reimbursementCycle: string,
): Promise<void> {
  await sendTemplateEmail("expense-approved", {
    to: employeeEmail,
    category: "expenses",
    vars: {
      category,
      amount: money(amount),
      approver_name: approverName,
      reimbursement_cycle: reimbursementCycle,
    },
  });
}

/** MIYO-0249: the hand-written expense-rejected template. */
export async function sendExpenseRejectedEmail(
  employeeEmail: string,
  category: string,
  amount: string | number,
  approverName: string,
  reason: string,
): Promise<void> {
  await sendTemplateEmail("expense-rejected", {
    to: employeeEmail,
    category: "expenses",
    vars: {
      category,
      amount: money(amount),
      approver_name: approverName,
      rejection_reason: reason?.trim() || "No reason was given.",
    },
  });
}

/** MIYO-0250: the hand-written expense-paid template. */
export async function sendExpensePaidEmail(
  employeeEmail: string,
  amount: string | number,
  paidOn: string,
  paymentReference?: string | null,
): Promise<void> {
  await sendTemplateEmail("expense-paid", {
    to: employeeEmail,
    category: "expenses",
    vars: {
      amount: money(amount),
      paid_on: paidOn,
      payment_reference: paymentReference?.trim() || "not recorded",
    },
  });
}
