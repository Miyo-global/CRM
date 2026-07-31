import "server-only";

import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { isOpenAIConfigured, aiText } from "@/lib/ai/openai";
import { db } from "@/lib/db";
import { emailCampaigns } from "@/lib/db/schema/crm";
import { socialMetrics } from "@/lib/db/schema/marketing";
import { eq, gte, desc, asc, and } from "drizzle-orm";

const BodySchema = z.object({
  period: z.enum(["last 7 days", "last 30 days", "last quarter"]),
});

function getPeriodDays(period: string): number {
  if (period === "last 7 days") return 7;
  if (period === "last quarter") return 90;
  return 30;
}


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

    const { period } = parsed.data;
    const days = getPeriodDays(period);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const campaigns = await db
      .select({
        name: emailCampaigns.name,
        subject: emailCampaigns.subject,
        status: emailCampaigns.status,
        sentCount: emailCampaigns.sentCount,
        openCount: emailCampaigns.openCount,
        clickCount: emailCampaigns.clickCount,
        failedCount: emailCampaigns.failedCount,
        sentAt: emailCampaigns.sentAt,
      })
      .from(emailCampaigns)
      .where(and(eq(emailCampaigns.orgId, session.orgId), gte(emailCampaigns.sentAt, since)))
      .orderBy(desc(emailCampaigns.createdAt))
      .limit(10);

    const social = await db
      .select()
      .from(socialMetrics)
      .where(
        and(eq(socialMetrics.orgId, session.orgId), gte(socialMetrics.metricDate, sinceStr))
      )
      .orderBy(asc(socialMetrics.platform), desc(socialMetrics.metricDate));

    const campaignLines =
      campaigns.length === 0
        ? "No email campaigns found in this period."
        : campaigns
            .map((c) => {
              const openRate =
                c.sentCount && c.sentCount > 0
                  ? `${((( c.openCount ?? 0) / c.sentCount) * 100).toFixed(1)}%`
                  : "N/A";
              const clickRate =
                c.sentCount && c.sentCount > 0
                  ? `${(((c.clickCount ?? 0) / c.sentCount) * 100).toFixed(1)}%`
                  : "N/A";
              return `- "${c.name}" | Subject: "${c.subject}" | Status: ${c.status} | Sent: ${c.sentCount ?? 0} | Open Rate: ${openRate} | Click Rate: ${clickRate}`;
            })
            .join("\n");

    const platformMap: Record<string, typeof social[0]> = {};
    for (const row of social) {
      if (!platformMap[row.platform]) {
        platformMap[row.platform] = row;
      }
    }

    const socialLines =
      Object.keys(platformMap).length === 0
        ? "No social media metrics found."
        : Object.values(platformMap)
            .map(
              (r) =>
                `- ${r.platform.charAt(0).toUpperCase() + r.platform.slice(1)}: ${r.followers ?? 0} followers, ${r.impressions ?? 0} impressions, ${r.engagements ?? 0} engagements, ${r.clicks ?? 0} clicks (as of ${r.metricDate})`
            )
            .join("\n");

    const userPrompt = `Analysis Period: ${period}

EMAIL CAMPAIGNS:
${campaignLines}

SOCIAL MEDIA METRICS:
${socialLines}

Please provide a structured weekly marketing performance report with:
1. Executive Summary (2-3 sentences)
2. Email Campaign Performance (what's working, what needs improvement)
3. Social Media Insights (platform trends, engagement analysis)
4. Key Recommendations (3-5 specific, actionable steps)
5. Risk Flags (any declining metrics or concerns to watch)`;

    const insights = await aiText({
      model: "fast",
      system:
        "You are a marketing performance analyst for an Indian B2B financial services company. Analyze the provided marketing data and generate actionable weekly insights. Be specific, data-driven, and practical. Focus on ROI, lead generation, and brand positioning in the Indian financial services market.",
      user: userPrompt,
      temperature: 0.4,
    });

    return ok({ insights, generatedAt: new Date().toISOString() });
  });
}
