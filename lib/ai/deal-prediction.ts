import "server-only";

import { aiInvoke, isOpenAIConfigured } from "./openai";
import { dealPredictionPrompt, type DealPredictionInput } from "./prompts";
import { DealPredictionSchema, type DealPredictionResult } from "./schemas";
import { db } from "@/lib/db";
import { deals, dealActivities } from "@/lib/db/schema";
import { eq, and, count, max } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function predictDealOutcome(
  orgId: string,
  dealId: number,
): Promise<DealPredictionResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-predict] OpenAI not configured");
    return null;
  }

  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.orgId, orgId)));

  if (!deal) return null;

  const [activityStats] = await db
    .select({ count: count(), lastDate: max(dealActivities.createdAt) })
    .from(dealActivities)
    .where(eq(dealActivities.dealId, dealId));

  const now = new Date();
  const createdAt = deal.createdAt ? new Date(deal.createdAt) : now;
  const daysInPipeline = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const updatedAt = deal.updatedAt ? new Date(deal.updatedAt) : createdAt;
  const daysInCurrentStage = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));

  const lastActivityDate = activityStats?.lastDate ? new Date(activityStats.lastDate) : null;
  const lastActivityDaysAgo = lastActivityDate
    ? Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const expectedClose = deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : null;
  const daysUntilExpectedClose = expectedClose
    ? Math.floor((expectedClose.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const input: DealPredictionInput = {
    dealName: deal.name,
    value: Number(deal.value ?? 0),
    stage: deal.stage,
    probability: deal.probability ?? 0,
    daysInPipeline,
    daysInCurrentStage,
    activityCount: activityStats?.count ?? 0,
    lastActivityDaysAgo,
    contactPerson: deal.contactPerson,
    assignedTo: deal.assignedToId,
    hasExpectedCloseDate: !!expectedClose,
    daysUntilExpectedClose,
    notes: deal.notes,
  };

  const prompt = dealPredictionPrompt(input);
  const result = await aiInvoke({
    model: "fast",
    schema: DealPredictionSchema,
    schemaName: "deal_prediction",
    system: prompt.system,
    user: prompt.user,
  });

  result.winProbability = Math.max(0, Math.min(100, Math.round(result.winProbability)));

  await db
    .update(deals)
    .set({ probability: result.winProbability, updatedAt: new Date() })
    .where(and(eq(deals.id, dealId), eq(deals.orgId, orgId)));

  return result;
}
