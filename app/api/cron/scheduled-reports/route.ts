import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, organizationMembers, leads, leadActivities } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { appUrl } from "@/lib/app-url";
import { verifyCronSecret, cronIdempotencyCheck } from "@/lib/cron-auth";

const IST = "Asia/Kolkata";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(request: Request) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  const dupeCheck = await cronIdempotencyCheck("scheduled-reports");
  if (dupeCheck) return dupeCheck;

  const now = new Date();
  const istParts = new Intl.DateTimeFormat("en-US", {
    timeZone: IST,
    weekday: "short",
    day: "numeric",
  }).formatToParts(now);
  const istWeekday = istParts.find((p) => p.type === "weekday")?.value;
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = istWeekday ? weekdayMap[istWeekday] ?? now.getDay() : now.getDay();
  const dayOfMonth = Number(istParts.find((p) => p.type === "day")?.value ?? now.getDate());

  try {
    const orgs = await db.query.organizations.findMany();

    for (const org of orgs) {

      const members = await db
        .select({
          userId: organizationMembers.userId,
          role: organizationMembers.role,
          email: users.email,
          isActive: users.isActive,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(eq(organizationMembers.orgId, org.id));
      const hrAdmins = members.filter(
        (m) => (m.role === "HR" || m.role === "CEO") && m.isActive
      );
      if (hrAdmins.length === 0) continue;

      try {
        logger.info(`Sending daily report for org ${org.id}`);
        const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        await sendDailyLeadReport(org.id, org.name, hrAdmins.map((u) => u.email).filter(Boolean) as string[], since, now);
      } catch (err) {
        logger.error("Daily report failed", { orgId: org.id, error: err });
      }

      if (dayOfWeek === 1) {
        try {
          logger.info(`Sending weekly report for org ${org.id}`);
          const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          await sendWeeklySalesReport(org.id, org.name, hrAdmins.map((u) => u.email).filter(Boolean) as string[], since, now);
        } catch (err) {
          logger.error("Weekly report failed", { orgId: org.id, error: err });
        }
      }

      if (dayOfMonth === 1) {
        try {
          logger.info(`Sending monthly report for org ${org.id}`);
          const since = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const until = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
          await sendMonthlyFullReport(org.id, org.name, hrAdmins.map((u) => u.email).filter(Boolean) as string[], since, until);
        } catch (err) {
          logger.error("Monthly report failed", { orgId: org.id, error: err });
        }
      }
    }

    return NextResponse.json({ success: true, processedOrgs: orgs.length });
  } catch (error) {
    logger.error("Scheduled reports cron failed", { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function sendDailyLeadReport(
  orgId: string,
  orgName: string,
  recipients: string[],
  since: Date,
  until: Date
) {
  const [recentLeads, recentActivities] = await Promise.all([
    db.query.leads.findMany({
      where: and(eq(leads.orgId, orgId), gte(leads.createdAt, since)),
      columns: { id: true, name: true, status: true, assignedToId: true, createdAt: true },
      with: { assignedTo: { columns: { name: true } } },
    }),
    db.query.leadActivities.findMany({
      where: and(eq(leadActivities.orgId, orgId), gte(leadActivities.createdAt, since)),
      columns: { id: true, type: true, leadId: true, userId: true },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const lead of recentLeads) {
    byStatus[lead.status ?? "UNKNOWN"] = (byStatus[lead.status ?? "UNKNOWN"] ?? 0) + 1;
  }

  const activitySummary: Record<string, number> = {};
  for (const a of recentActivities) {
    activitySummary[a.type] = (activitySummary[a.type] ?? 0) + 1;
  }

  const html = buildReportEmail({
    title: `Daily Lead Activity — ${formatDate(until)}`,
    orgName,
    sections: [
      {
        heading: "New Leads (Last 24h)",
        rows: [
          ["Total new leads", String(recentLeads.length)],
          ...Object.entries(byStatus).map(([s, c]) => [s, String(c)]),
        ],
      },
      {
        heading: "Activities (Last 24h)",
        rows: Object.entries(activitySummary).length
          ? Object.entries(activitySummary).map(([t, c]) => [t, String(c)])
          : [["No activities recorded", ""]],
      },
    ],
  });

  for (const to of recipients) {
    await sendEmail({ to, subject: `[${orgName}] Daily Lead Report — ${formatDate(until)}`, html });
  }
}

async function sendWeeklySalesReport(
  orgId: string,
  orgName: string,
  recipients: string[],
  since: Date,
  until: Date
) {
  const [weekLeads, weekActivities] = await Promise.all([
    db.query.leads.findMany({
      where: and(eq(leads.orgId, orgId), gte(leads.createdAt, since)),
      columns: { id: true, status: true, assignedToId: true, potentialValue: true },
      with: { assignedTo: { columns: { name: true } } },
    }),
    db.query.leadActivities.findMany({
      where: and(eq(leadActivities.orgId, orgId), gte(leadActivities.createdAt, since)),
      columns: { type: true, userId: true },
    }),
  ]);

  const converted = weekLeads.filter((l) => l.status === "CONVERTED");
  const totalRevenue = converted.reduce((s, l) => s + Number(l.potentialValue ?? 0), 0);
  const conversionRate = weekLeads.length > 0
    ? ((converted.length / weekLeads.length) * 100).toFixed(1)
    : "0";

  const userStats: Record<string, { name: string; leads: number; converted: number; revenue: number; activities: number }> = {};
  for (const lead of weekLeads) {
    if (!lead.assignedToId) continue;
    const name = lead.assignedTo?.name ?? lead.assignedToId;
    const entry = userStats[lead.assignedToId] ?? { name, leads: 0, converted: 0, revenue: 0, activities: 0 };
    entry.leads++;
    if (lead.status === "CONVERTED") {
      entry.converted++;
      entry.revenue += Number(lead.potentialValue ?? 0);
    }
    userStats[lead.assignedToId] = entry;
  }
  for (const a of weekActivities) {
    if (!a.userId) continue;
    if (userStats[a.userId]) userStats[a.userId].activities++;
  }

  const rows = Object.values(userStats)
    .sort((a, b) => b.converted - a.converted)
    .map((s) => [s.name, `${s.converted}/${s.leads} converted • ₹${s.revenue.toLocaleString()}`]);

  const html = buildReportEmail({
    title: `Weekly Sales Performance — ${formatDate(since)} to ${formatDate(until)}`,
    orgName,
    sections: [
      {
        heading: "Overview",
        rows: [
          ["Total leads", String(weekLeads.length)],
          ["Converted", String(converted.length)],
          ["Conversion rate", `${conversionRate}%`],
          ["Total revenue", `₹${totalRevenue.toLocaleString()}`],
          ["Total activities", String(weekActivities.length)],
        ],
      },
      {
        heading: "Per Salesperson",
        rows: rows.length ? rows : [["No data", ""]],
      },
    ],
  });

  for (const to of recipients) {
    await sendEmail({ to, subject: `[${orgName}] Weekly Sales Report`, html });
  }
}

async function sendMonthlyFullReport(
  orgId: string,
  orgName: string,
  recipients: string[],
  since: Date,
  until: Date
) {
  const monthLeads = await db.query.leads.findMany({
    where: and(eq(leads.orgId, orgId), gte(leads.createdAt, since)),
    columns: { id: true, status: true, potentialValue: true, assignedToId: true },
  });

  const byStatus: Record<string, number> = {};
  for (const lead of monthLeads) {
    byStatus[lead.status ?? "UNKNOWN"] = (byStatus[lead.status ?? "UNKNOWN"] ?? 0) + 1;
  }
  const converted = monthLeads.filter((l) => l.status === "CONVERTED");
  const totalRevenue = converted.reduce((s, l) => s + Number(l.potentialValue ?? 0), 0);

  const monthLabel = since.toLocaleDateString("en-IN", { timeZone: IST, month: "long", year: "numeric" });

  const html = buildReportEmail({
    title: `Monthly Full Report — ${monthLabel}`,
    orgName,
    sections: [
      {
        heading: "CRM Summary",
        rows: [
          ["Total leads", String(monthLeads.length)],
          ["Converted", String(converted.length)],
          ["Conversion rate", monthLeads.length > 0 ? `${((converted.length / monthLeads.length) * 100).toFixed(1)}%` : "0%"],
          ["Revenue generated", `₹${totalRevenue.toLocaleString()}`],
          ...Object.entries(byStatus).map(([s, c]) => [`  ${s}`, String(c)]),
        ],
      },
    ],
    footer: `Full report available at ${appUrl}/reports`,
  });

  for (const to of recipients) {
    await sendEmail({ to, subject: `[${orgName}] Monthly Report — ${monthLabel}`, html });
  }
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface ReportSection {
  heading: string;
  rows: string[][];
}

function buildReportEmail(opts: {
  title: string;
  orgName: string;
  sections: ReportSection[];
  footer?: string;
}) {
  const sectionsHtml = opts.sections
    .map(
      (sec) => `
      <h3 style="color:#0f2b7f;margin:24px 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;">${escapeHtml(sec.heading)}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        ${sec.rows
          .map(
            (row) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;color:#374151;">${escapeHtml(row[0] ?? "")}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;text-align:right;">${escapeHtml(row[1] ?? "")}</td>
          </tr>`
          )
          .join("")}
      </table>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
        <tr>
          <td style="background:#0f2b7f;padding:20px 28px;">
            <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700;">${escapeHtml(opts.orgName)}</h1>
            <p style="margin:4px 0 0;color:#bd882c;font-size:13px;">${escapeHtml(opts.title)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px;">
            ${sectionsHtml}
            ${opts.footer ? `<p style="margin-top:24px;font-size:12px;color:#6b7280;">${opts.footer}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;padding:16px 28px;font-size:11px;color:#9ca3af;text-align:center;">
            This is an automated report from Miyo Global CRM. Do not reply to this email.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
