import { sendTemplateEmail } from "./sender";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";
import { formatIST } from "@/lib/date-utils";

function money(amount: string | number): string {
  const n = typeof amount === "number" ? amount : Number(amount || 0);
  return `${CURRENCY_SYMBOL}${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface BonusMailParams {
  employeeName: string;
  amount: string;
  typeLabel: string;
  reason?: string | null;
  markedByName: string;
  paidOn?: Date;
}

/** MIYO-0252: the hand-written bonus-paid-employee template. */
export async function sendBonusPaidEmployeeEmail(
  employeeEmail: string,
  params: BonusMailParams,
) {
  await sendTemplateEmail("bonus-paid-employee", {
    to: employeeEmail,
    category: "payroll",
    vars: {
      amount: money(params.amount),
      bonus_type: params.typeLabel,
      paid_on: `${formatIST(params.paidOn ?? new Date())} IST`,
      note: params.reason?.trim() || "none",
    },
  });
}

/** MIYO-0253: the hand-written bonus-paid-stakeholder template. */
export async function sendBonusPaidStakeholderEmail(
  recipientEmail: string | string[],
  params: BonusMailParams,
) {
  await sendTemplateEmail("bonus-paid-stakeholder", {
    to: recipientEmail,
    category: "payroll",
    vars: {
      employee_name: params.employeeName,
      amount: money(params.amount),
      bonus_type: params.typeLabel,
      approver_name: params.markedByName,
      paid_on: `${formatIST(params.paidOn ?? new Date())} IST`,
    },
  });
}
