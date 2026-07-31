import "server-only";

import { aiInvoke, isOpenAIConfigured } from "./openai";
import { churnRiskPrompt, type ChurnRiskInput } from "./prompts";
import { ChurnRiskSchema, type ChurnRiskResult } from "./schemas";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function analyzeChurnRisk(
  orgId: string,
  clientId: number,
  context?: { openTickets?: number; ticketsLast90Days?: number; daysSinceLastActivity?: number | null },
): Promise<ChurnRiskResult | null> {
  if (!isOpenAIConfigured()) {
    logger.warn("[ai-churn] OpenAI not configured");
    return null;
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)));

  if (!client) return null;

  const now = new Date();
  const convertedAt = client.convertedAt ? new Date(client.convertedAt) : client.createdAt ? new Date(client.createdAt) : now;
  const daysSinceConversion = Math.floor((now.getTime() - convertedAt.getTime()) / (1000 * 60 * 60 * 24));

  const input: ChurnRiskInput = {
    clientName: client.name,
    company: client.company,
    healthScore: client.healthScore ?? 50,
    investmentValue: client.investmentValue ? Number(client.investmentValue) : null,
    daysSinceLastActivity: context?.daysSinceLastActivity ?? null,
    openTickets: context?.openTickets ?? 0,
    totalTicketsLast90Days: context?.ticketsLast90Days ?? 0,
    accountManagerName: null,
    status: client.status,
    daysSinceConversion,
  };

  const prompt = churnRiskPrompt(input);
  const result = await aiInvoke({
    model: "fast",
    schema: ChurnRiskSchema,
    schemaName: "churn_risk",
    system: prompt.system,
    user: prompt.user,
  });

  result.churnRiskScore = Math.max(0, Math.min(100, Math.round(result.churnRiskScore)));

  const healthStatus = result.churnRiskScore >= 70 ? "critical"
    : result.churnRiskScore >= 40 ? "at_risk"
    : "healthy";

  const healthScore = Math.max(0, 100 - result.churnRiskScore);

  await db
    .update(clients)
    .set({
      healthScore,
      healthStatus,
      churnRiskScore: result.churnRiskScore,
      churnRiskReasoning: result.reasoning,
      lastHealthCheck: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(clients.id, clientId), eq(clients.orgId, orgId)));

  return result;
}
