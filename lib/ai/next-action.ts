import "server-only";

import { aiInvoke, isOpenAIConfigured } from "./openai";
import { nextActionPrompt, type NextActionInput } from "./prompts";
import { NextActionSchema, type NextActionResult } from "./schemas";
import { db } from "@/lib/db";
import { leads, leadActivities } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function getNextBestAction(
  orgId: string,
  leadId: number,
): Promise<NextActionResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-action] OpenAI not configured");
    return null;
  }

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.orgId, orgId)));

  if (!lead) return null;

  const [lastActivity] = await db
    .select()
    .from(leadActivities)
    .where(eq(leadActivities.leadId, leadId))
    .orderBy(desc(leadActivities.date))
    .limit(1);

  const now = new Date();
  const lastActivityDate = lastActivity?.date ? new Date(lastActivity.date) : null;
  const daysSinceLastActivity = lastActivityDate
    ? Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const followUpDate = lead.followUpDate ? new Date(lead.followUpDate) : null;
  const isOverdue = followUpDate ? followUpDate < now : false;

  const input: NextActionInput = {
    entityType: "lead",
    name: lead.name,
    status: lead.status,
    priority: lead.priority,
    lastActivityType: lastActivity?.type ?? null,
    lastActivityDate: lastActivity?.date ? new Date(lastActivity.date).toISOString().split("T")[0] : null,
    daysSinceLastActivity,
    value: lead.potentialValue ? Number(lead.potentialValue) : null,
    assignedTo: lead.assignedToId,
    followUpDate: followUpDate?.toISOString().split("T")[0] ?? null,
    isOverdueFollowUp: isOverdue,
    notes: lead.notes,
  };

  const prompt = nextActionPrompt(input);
  return aiInvoke({
    model: "fast",
    schema: NextActionSchema,
    schemaName: "next_action",
    system: prompt.system,
    user: prompt.user,
  });
}
