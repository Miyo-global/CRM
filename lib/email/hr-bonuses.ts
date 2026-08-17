import { sendEmail } from "./sender";
import { baseUrl } from "./sender";
import {
  getBonusPaidEmployeeEmailTemplate,
  getBonusPaidStakeholderEmailTemplate,
} from "../email-templates/bonus";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";

export async function sendBonusPaidEmployeeEmail(
  employeeEmail: string,
  params: {
    employeeName: string;
    amount: string;
    typeLabel: string;
    reason?: string | null;
    markedByName: string;
  },
) {
  const bonusesUrl = `${baseUrl}/hr/my-bonuses`;
  await sendEmail({
    to: employeeEmail,
    subject: `Your Bonus Has Been Paid — ${CURRENCY_SYMBOL}${params.amount}`,
    html: getBonusPaidEmployeeEmailTemplate({ ...params, bonusesUrl }),
  });
}

export async function sendBonusPaidStakeholderEmail(
  recipientEmail: string,
  params: {
    employeeName: string;
    amount: string;
    typeLabel: string;
    reason?: string | null;
    markedByName: string;
  },
) {
  const bonusesUrl = `${baseUrl}/hr/bonuses`;
  await sendEmail({
    to: recipientEmail,
    subject: `Bonus Paid — ${params.employeeName} (${CURRENCY_SYMBOL}${params.amount})`,
    html: getBonusPaidStakeholderEmailTemplate({ ...params, bonusesUrl }),
  });
}
