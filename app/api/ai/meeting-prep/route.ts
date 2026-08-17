import "server-only";

import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { isOpenAIConfigured, aiText } from "@/lib/ai/openai";
import { db } from "@/lib/db";
import { leads, leadActivities, clientAccounts, clientAccountActivities } from "@/lib/db/schema/crm";
import { eq, and, desc } from "drizzle-orm";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

const BodySchema = z.object({
  meetingTitle: z.string().min(1).max(200),
  attendeeType: z.enum(["lead", "client"]),
  attendeeId: z.number().int().positive(),
  scheduledAt: z.string(),
  notes: z.string().max(2000).optional(),
});


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI features are not configured. Set OPENAI_API_KEY.", 503);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return err("Invalid JSON body", 400);
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { meetingTitle, attendeeType, attendeeId, scheduledAt, notes } = parsed.data;

    let attendeeName = "Unknown";
    let contextString = "";

    if (attendeeType === "lead") {
      const lead = await db.query.leads.findFirst({
        where: and(eq(leads.id, attendeeId), eq(leads.orgId, session.orgId)),
      });

      if (!lead) {
        return err("Lead not found", 404);
      }

      attendeeName = lead.name;

      const activities = await db
        .select({
          type: leadActivities.type,
          date: leadActivities.date,
          subject: leadActivities.subject,
          notes: leadActivities.notes,
          outcome: leadActivities.outcome,
        })
        .from(leadActivities)
        .where(eq(leadActivities.leadId, attendeeId))
        .orderBy(desc(leadActivities.date))
        .limit(5);

      const activitiesText =
        activities.length === 0
          ? "No previous interactions recorded."
          : activities
              .map((a) => {
                const date = a.date ? new Date(a.date).toLocaleDateString(DEFAULT_LOCALE) : "Unknown";
                return `- [${date}] ${a.type}${a.subject ? `: ${a.subject}` : ""} — ${a.notes ?? "No notes"}${a.outcome ? ` | Outcome: ${a.outcome}` : ""}`;
              })
              .join("\n");

      contextString = `ATTENDEE TYPE: Lead (Prospective Client)

LEAD PROFILE:
- Name: ${lead.name}
- Email: ${lead.email ?? "N/A"}
- Phone: ${lead.phone ?? "N/A"}
- Company: ${lead.company ?? "N/A"}
- Designation: ${lead.designation ?? "N/A"}
- City: ${lead.city ?? "N/A"}
- Source: ${lead.source ?? "N/A"}
- Status: ${lead.status}
- Priority: ${lead.priority ?? "N/A"}
- AI Score: ${lead.score ?? "Not scored"}
- Potential Value: ${lead.potentialValue ? `${CURRENCY_SYMBOL}${Number(lead.potentialValue).toLocaleString(DEFAULT_LOCALE)}` : "Not specified"}
- Investment Interest: ${lead.investmentInterest ? `${CURRENCY_SYMBOL}${Number(lead.investmentInterest).toLocaleString(DEFAULT_LOCALE)}` : "Not specified"}
- Tags: ${lead.tags?.join(", ") ?? "None"}
- Notes: ${lead.notes ?? "None"}
- Follow-up Notes: ${lead.followUpNotes ?? "None"}

PREVIOUS INTERACTIONS:
${activitiesText}`;
    } else {
      const account = await db.query.clientAccounts.findFirst({
        where: and(
          eq(clientAccounts.id, attendeeId),
          eq(clientAccounts.orgId, session.orgId),
        ),
      });

      if (!account) {
        return err("Client account not found", 404);
      }

      attendeeName = account.clientName;

      const activities = await db
        .select({
          activityType: clientAccountActivities.activityType,
          description: clientAccountActivities.description,
          createdAt: clientAccountActivities.createdAt,
        })
        .from(clientAccountActivities)
        .where(eq(clientAccountActivities.clientAccountId, attendeeId))
        .orderBy(desc(clientAccountActivities.createdAt))
        .limit(5);

      const activitiesText =
        activities.length === 0
          ? "No recent activities recorded."
          : activities
              .map((a) => {
                const date = a.createdAt
                  ? new Date(a.createdAt).toLocaleDateString(DEFAULT_LOCALE)
                  : "Unknown";
                return `- [${date}] ${a.activityType}: ${a.description ?? "No description"}`;
              })
              .join("\n");

      contextString = `ATTENDEE TYPE: Existing Client

CLIENT PROFILE:
- Name: ${account.clientName}
- Email: ${account.clientEmail ?? "N/A"}
- Phone: ${account.clientPhone ?? "N/A"}
- Account Status: ${account.status}
- Plan: ${account.planName ?? "Not specified"}
- Investment Amount: ${account.investmentAmount ? `${CURRENCY_SYMBOL}${Number(account.investmentAmount).toLocaleString(DEFAULT_LOCALE)}` : "N/A"}
- Investment Date: ${account.investmentDate ? new Date(account.investmentDate).toLocaleDateString(DEFAULT_LOCALE) : "N/A"}
- Renewal Stage: ${account.renewalStage}
- Renewal Date: ${account.renewalDate ?? "Not set"}
- Renewal Notes: ${account.renewalNotes ?? "None"}
- Conversion Notes: ${account.conversionNotes ?? "None"}

RECENT INTERACTIONS:
${activitiesText}`;
    }

    const userPrompt = `Meeting Title: ${meetingTitle}
Scheduled: ${new Date(scheduledAt).toLocaleString(DEFAULT_LOCALE, { dateStyle: "full", timeStyle: "short" })}
${notes ? `Additional Notes from Organizer: ${notes}` : ""}

${contextString}

Please generate a structured pre-meeting brief with:
1. Meeting Overview (purpose, what success looks like)
2. Attendee Background (key facts about this ${attendeeType} the team should know)
3. Relationship History (summary of past interactions and current standing)
4. Key Discussion Points (3-5 specific topics to address in this meeting)
5. Potential Pain Points & Opportunities (what to look out for or capitalize on)
6. Suggested Questions to Ask (3-4 open-ended questions to drive the conversation)
7. Preparation Checklist (materials or data to prepare before the meeting)`;

    const brief = await aiText({
      model: "standard",
      system:
        "You are an executive assistant preparing meeting briefs for an Indian investment firm sales team. Generate structured, concise pre-meeting briefs that help the team walk into every meeting fully prepared. Be specific, actionable, and tailor advice to the Indian B2B financial services context.",
      user: userPrompt,
    });

    return ok({
      brief,
      attendeeName,
      generatedAt: new Date().toISOString(),
    });
  });
}
