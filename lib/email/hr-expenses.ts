import { sendEmail } from "./sender";
import { baseUrl } from "./sender";
import {
  getExpenseSubmittedEmailTemplate,
  getExpenseApprovedEmailTemplate,
  getExpenseRejectedEmailTemplate,
  getExpensePaidEmailTemplate,
} from "../email-templates";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";

export async function sendExpenseSubmittedEmail(
  approverEmail: string,
  approverName: string,
  employeeName: string,
  category: string,
  amount: string,
  description: string
) {
  const expenseLink = `${baseUrl}/hr/expenses`;
  await sendEmail({
    to: approverEmail,
    subject: `New Expense Claim from ${employeeName}`,
    html: getExpenseSubmittedEmailTemplate(
      approverName,
      employeeName,
      category,
      amount,
      description,
      expenseLink
    ),
  });
}

export async function sendExpenseApprovedEmail(
  employeeEmail: string,
  employeeName: string,
  category: string,
  amount: string,
  approverName: string
) {
  await sendEmail({
    to: employeeEmail,
    subject: `Expense Claim Approved - ${CURRENCY_SYMBOL}${amount}`,
    html: getExpenseApprovedEmailTemplate(employeeName, category, amount, approverName),
  });
}

export async function sendExpenseRejectedEmail(
  employeeEmail: string,
  employeeName: string,
  category: string,
  amount: string,
  approverName: string,
  reason: string
) {
  await sendEmail({
    to: employeeEmail,
    subject: `Expense Claim Rejected - ${CURRENCY_SYMBOL}${amount}`,
    html: getExpenseRejectedEmailTemplate(employeeName, category, amount, approverName, reason),
  });
}

export async function sendExpensePaidEmail(
  employeeEmail: string,
  employeeName: string,
  category: string,
  amount: string,
  transactionRef?: string
) {
  await sendEmail({
    to: employeeEmail,
    subject: `Expense Reimbursed - ${CURRENCY_SYMBOL}${amount}`,
    html: getExpensePaidEmailTemplate(employeeName, category, amount, transactionRef),
  });
}
