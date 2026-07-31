import "server-only";

import { aiInvoke, aiText, isAIConfigured } from "./openai";
import { helpdeskReplyPrompt, type HelpdeskReplyInput } from "./prompts";
import { HelpdeskReplySchema, type HelpdeskReplyResult } from "./schemas";
import { db } from "@/lib/db";
import { helpdeskTickets, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function aiSuggestHelpdeskReply(
  orgId: string,
  ticketId: number,
): Promise<HelpdeskReplyResult | null> {
  if (!isAIConfigured()) {
    logger.warn("[ai-helpdesk] No AI provider configured");
    return null;
  }

  const [ticket] = await db
    .select({
      title: helpdeskTickets.title,
      description: helpdeskTickets.description,
      category: helpdeskTickets.category,
      priority: helpdeskTickets.priority,
      userId: helpdeskTickets.userId,
      employeeName: users.name,
    })
    .from(helpdeskTickets)
    .leftJoin(users, eq(helpdeskTickets.userId, users.id))
    .where(and(eq(helpdeskTickets.id, ticketId), eq(helpdeskTickets.orgId, orgId)));

  if (!ticket) return null;

  const input: HelpdeskReplyInput = {
    ticketTitle: ticket.title,
    ticketDescription: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    employeeName: ticket.employeeName,
  };

  const prompt = helpdeskReplyPrompt(input);

  try {
    return await aiInvoke({
      model: "fast",
      schema: HelpdeskReplySchema,
      schemaName: "helpdesk_reply",
      system: prompt.system,
      user: prompt.user,
    });
  } catch (error) {
    logger.warn("[ai-helpdesk] Structured reply failed, using text fallback", {
      ticketId,
      error: error instanceof Error ? error.message : "unknown",
    });

    try {
      const text = await aiText({
        model: "fast",
        system: prompt.system,
        user: `${prompt.user}\n\nRespond with a concise professional reply only (max 120 words).`,
      });
      return {
        suggestedReply: text.trim(),
        category: ticket.category ?? "Other",
        estimatedResolutionTime: "1-2 business days",
        followUpActions: [],
      };
    } catch (fallbackError) {
      logger.error("[ai-helpdesk] Text fallback failed", {
        ticketId,
        error: fallbackError instanceof Error ? fallbackError.message : "unknown",
      });
      return null;
    }
  }
}
