import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiSuggestHelpdeskReply } from "@/lib/ai/helpdesk-reply";
import { isAIConfigured } from "@/lib/ai/openai";
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

    try {
      const result = await aiSuggestHelpdeskReply(session.orgId, ticketId);
      if (!result) {
        return err("Could not generate a reply for this ticket.", 502);
      }
      return ok(result);
    } catch (error) {
      logger.error("[ai-helpdesk-reply] Unexpected error", {
        ticketId,
        error: error instanceof Error ? error.message : "unknown",
      });
      return err("AI reply generation failed. Please try again later.", 502);
    }
  });
}
