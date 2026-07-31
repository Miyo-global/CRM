import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiInvoke, aiText, isAIConfigured } from "@/lib/ai/openai";
import { helpdeskReplyPrompt } from "@/lib/ai/prompts";
import { HelpdeskReplySchema } from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import { supportTickets, supportTicketMessages, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { z } from "zod";

const schema = z.object({
  ticketId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAIConfigured()) {
      return err("AI is not configured. Set OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.", 503);
    }

    const { ticketId } = await parseBody(req, schema);

    const [ticket] = await db
      .select({
        title: supportTickets.title,
        description: supportTickets.description,
        category: supportTickets.category,
        priority: supportTickets.priority,
        createdBy: supportTickets.createdBy,
        creatorName: users.name,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.createdBy, users.id))
      .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.orgId, session.orgId)));

    if (!ticket) return err("Ticket not found.", 404);

    const messages = await db
      .select({ body: supportTicketMessages.body, authorId: supportTicketMessages.authorId, isInternal: supportTicketMessages.isInternal })
      .from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(asc(supportTicketMessages.createdAt))
      .limit(10);

    const conversationContext = messages
      .filter((m) => !m.isInternal)
      .map((m) => m.body)
      .join("\n---\n");

    const fullDescription = [ticket.description, conversationContext ? `\nConversation:\n${conversationContext}` : ""]
      .filter(Boolean)
      .join("\n");

    const prompt = helpdeskReplyPrompt({
      ticketTitle: ticket.title,
      ticketDescription: fullDescription,
      category: ticket.category,
      priority: ticket.priority,
      employeeName: ticket.creatorName,
    });

    try {
      const result = await aiInvoke({
        model: "fast",
        schema: HelpdeskReplySchema,
        schemaName: "support_reply",
        system: prompt.system,
        user: prompt.user,
      });
      return ok(result);
    } catch (error) {
      logger.warn("[ai-support-reply] Structured reply failed, using text fallback", {
        ticketId,
        error: error instanceof Error ? error.message : "unknown",
      });
      try {
        const text = await aiText({
          model: "fast",
          system: prompt.system,
          user: `${prompt.user}\n\nRespond with a concise professional reply only (max 120 words).`,
        });
        return ok({
          suggestedReply: text.trim(),
          category: ticket.category ?? "General Inquiry",
          estimatedResolutionTime: "1-2 business days",
          followUpActions: [],
        });
      } catch (fallbackError) {
        logger.error("[ai-support-reply] Text fallback failed", {
          ticketId,
          error: fallbackError instanceof Error ? fallbackError.message : "unknown",
        });
        return err("AI reply generation failed. Please try again later.", 502);
      }
    }
  });
}
