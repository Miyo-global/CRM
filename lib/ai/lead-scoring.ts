import "server-only";

import { aiInvoke, isOpenAIConfigured } from "./openai";
import { leadScoringPrompt, type LeadScoringInput } from "./prompts";
import { LeadScoreSchema, type LeadScoreResult } from "./schemas";
import { db } from "@/lib/db";
import { leads, leadActivities } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function aiScoreLead(
  orgId: string,
  leadId: number,
): Promise<LeadScoreResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-score] OpenAI not configured, skipping AI scoring");
    return null;
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)));

  if (!lead) return null;

  const [activityResult] = await db
    .select({ count: count() })
    .from(leadActivities)
    .where(eq(leadActivities.leadId, leadId));

  const daysSinceCreated = lead.createdAt
    ? Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const input: LeadScoringInput = {
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    designation: lead.designation,
    city: lead.city,
    source: lead.source,
    priority: lead.priority,
    potentialValue: lead.potentialValue,
    investmentInterest: lead.investmentInterest,
    notes: lead.notes,
    tags: lead.tags,
    daysSinceCreated,
    activityCount: activityResult?.count ?? 0,
    hasAssignee: !!lead.assignedToId,
  };

  const prompt = leadScoringPrompt(input);

  const result = await aiInvoke({
    model: "fast",
    schema: LeadScoreSchema,
    schemaName: "lead_score",
    system: prompt.system,
    user: prompt.user,
  });

  result.score = Math.max(0, Math.min(100, Math.round(result.score)));

  await db
    .update(leads)
    .set({ score: result.score, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)));

  return result;
}

export async function aiBatchScoreLeads(
  orgId: string,
  leadIds: number[],
): Promise<Map<number, LeadScoreResult>> {
  const results = new Map<number, LeadScoreResult>();

  for (const leadId of leadIds) {
    try {
      const result = await aiScoreLead(orgId, leadId);
      if (result) results.set(leadId, result);
    } catch (error) {
      logger.error(`[ai-score] Failed to score lead ${leadId}:`, error);
    }
  }

  return results;
}
