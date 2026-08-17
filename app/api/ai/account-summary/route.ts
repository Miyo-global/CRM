import "server-only";

import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { isOpenAIConfigured, aiText } from "@/lib/ai/openai";
import { db } from "@/lib/db";
import { clientAccounts, clientAccountActivities, leads } from "@/lib/db/schema/crm";
import { eq, and, desc } from "drizzle-orm";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

const BodySchema = z.object({
  clientId: z.number().int().positive(),
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

    const { clientId } = parsed.data;

    const account = await db.query.clientAccounts.findFirst({
      where: and(
        eq(clientAccounts.id, clientId),
        eq(clientAccounts.orgId, session.orgId),
      ),
    });

    if (!account) {
      return err("Client account not found", 404);
    }

    const lead = account.leadId
      ? await db.query.leads.findFirst({
          where: and(
            eq(leads.id, account.leadId),
            eq(leads.orgId, session.orgId),
          ),
        })
      : null;

    const activities = await db
      .select({
        activityType: clientAccountActivities.activityType,
        description: clientAccountActivities.description,
        createdAt: clientAccountActivities.createdAt,
      })
      .from(clientAccountActivities)
      .where(eq(clientAccountActivities.clientAccountId, clientId))
      .orderBy(desc(clientAccountActivities.createdAt))
      .limit(5);

    const investmentAmount = account.investmentAmount
      ? `${CURRENCY_SYMBOL}${Number(account.investmentAmount).toLocaleString(DEFAULT_LOCALE)}`
      : "Not specified";

    const estimatedInvestment = account.estimatedInvestment
      ? `${CURRENCY_SYMBOL}${Number(account.estimatedInvestment).toLocaleString(DEFAULT_LOCALE)}`
      : "Not specified";

    const activitiesText =
      activities.length === 0
        ? "No recent activities recorded."
        : activities
            .map((a) => {
              const date = a.createdAt
                ? new Date(a.createdAt).toLocaleDateString(DEFAULT_LOCALE)
                : "Unknown date";
              return `- [${date}] ${a.activityType}: ${a.description ?? "No description"}`;
            })
            .join("\n");

    const userPrompt = `Generate a professional 1-page account summary for an executive briefing.

CLIENT ACCOUNT DETAILS:
- Client Name: ${account.clientName}
- Email: ${account.clientEmail ?? "N/A"}
- Phone: ${account.clientPhone ?? "N/A"}
- Status: ${account.status}
- Plan: ${account.planName ?? "Not specified"}
- Investment Amount: ${investmentAmount}
- Estimated Investment: ${estimatedInvestment}
- Investment Date: ${account.investmentDate ? new Date(account.investmentDate).toLocaleDateString(DEFAULT_LOCALE) : "N/A"}
- Renewal Stage: ${account.renewalStage}
- Renewal Date: ${account.renewalDate ?? "Not set"}
- Conversion Notes: ${account.conversionNotes ?? "None"}
- Renewal Notes: ${account.renewalNotes ?? "None"}
- Account Created: ${new Date(account.createdAt).toLocaleDateString(DEFAULT_LOCALE)}

LEAD CONTEXT:
${lead ? `- Source: ${lead.source ?? "N/A"}, Priority: ${lead.priority ?? "N/A"}, City: ${lead.city ?? "N/A"}, Company: ${lead.company ?? "N/A"}` : "- No lead data available"}

RECENT ACTIVITIES (Last 5):
${activitiesText}

Please generate a comprehensive account summary with:
1. Executive Overview (2-3 sentences on account health and relationship status)
2. Investment Profile (current investment, plan details, financial standing)
3. Renewal Status (upcoming renewal details, stage, recommended actions)
4. Recent Engagement (summary of recent interactions and outcomes)
5. Key Risks & Opportunities (any flags or upsell potential)
6. Recommended Next Steps (2-3 specific actions for the account manager)`;

    const summary = await aiText({
      model: "standard",
      system:
        "You are an executive assistant preparing client briefing documents for an Indian investment firm. Generate concise, professional account summaries that help account managers and executives quickly understand the full picture of a client relationship. Be data-driven and specific.",
      user: userPrompt,
    });

    return ok({
      summary,
      clientName: account.clientName,
      generatedAt: new Date().toISOString(),
    });
  });
}
