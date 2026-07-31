import { db } from "@/lib/db";
import { lateArrivalWarnings, emailTemplates } from "@/lib/db/schema";
import { and, count, eq, gte, lte } from "drizzle-orm";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { sendEmail } from "@/lib/email";

function replaceTemplateVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return vars[key] ?? "";
  });
}

const LATE_TEMPLATE_NAMES = [
  "01 — Late Coming — 1st Reminder (Soft)",
  "02 — Late Coming — 2nd Warning",
  "03 — Late Coming — Final Warning",
] as const;

export function minutesSinceMidnightIst(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return h * 60 + m;
}

export function getLateCutoffMinutesIst(): number {
  const raw = process.env.ATTENDANCE_LATE_CUTOFF_MINUTES_IST?.trim();
  if (raw && /^\d+$/.test(raw)) return parseInt(raw, 10);
  return 10 * 60 + 20;
}

export async function handleLateArrivalAfterCheckIn(params: {
  orgId: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  date: string;
  checkIn: Date;
  attendanceId: number;
}): Promise<void> {
  const { orgId, userId, userName, userEmail, date, checkIn, attendanceId } = params;

  const existingDay = await db.query.lateArrivalWarnings.findFirst({
    where: and(
      eq(lateArrivalWarnings.orgId, orgId),
      eq(lateArrivalWarnings.userId, userId),
      eq(lateArrivalWarnings.date, date)
    ),
  });
  if (existingDay) return;

  const cutoff = getLateCutoffMinutesIst();
  if (minutesSinceMidnightIst(checkIn) <= cutoff) return;

  const monthStart = format(startOfMonth(parseISO(date)), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(parseISO(date)), "yyyy-MM-dd");

  const [{ value: monthCount }] = await db
    .select({ value: count() })
    .from(lateArrivalWarnings)
    .where(
      and(
        eq(lateArrivalWarnings.orgId, orgId),
        eq(lateArrivalWarnings.userId, userId),
        gte(lateArrivalWarnings.date, monthStart),
        lte(lateArrivalWarnings.date, monthEnd)
      )
    );

  const warningNumber = Number(monthCount) + 1;

  await db.insert(lateArrivalWarnings).values({
    orgId,
    userId,
    date,
    warningNumber,
    attendanceId,
  });

  if (warningNumber > 3 || !userEmail?.trim()) return;

  const templateName = LATE_TEMPLATE_NAMES[warningNumber - 1];
  const template = await db.query.emailTemplates.findFirst({
    where: and(eq(emailTemplates.orgId, orgId), eq(emailTemplates.name, templateName)),
  });
  if (!template) return;

  const displayName =
    userName?.trim() ||
    userEmail.split("@")[0] ||
    "there";
  const vars: Record<string, string> = {
    employee_name: displayName,
    name: displayName,
    date: format(parseISO(date), "dd MMM yyyy"),
  };
  const subject = replaceTemplateVariables(template.subject, vars);
  const html = replaceTemplateVariables(template.body, vars);

  try {
    await sendEmail({
      to: userEmail.trim(),
      subject,
      html,
    });
  } catch {
    /* non-fatal */
  }
}
