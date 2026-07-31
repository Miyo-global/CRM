import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiInvoke, isOpenAIConfigured } from "@/lib/ai/openai";
import { conversationSummaryPrompt } from "@/lib/ai/prompts";
import { ConversationSummarySchema } from "@/lib/ai/schemas";
import { z } from "zod";

const schema = z.object({
  activityType: z.string().min(1).max(100),
  subject: z.string().max(500).optional(),
  notes: z.string().min(1, "Notes are required for summarization").max(20000, "Notes are too long"),
  leadName: z.string().max(200).optional(),
  dealName: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    if (!isOpenAIConfigured()) return err("AI not configured", 503);

    const input = await parseBody(req, schema);
    const prompt = conversationSummaryPrompt(input);

    const result = await aiInvoke({
      model: "fast",
      schema: ConversationSummarySchema,
      schemaName: "conversation_summary",
      system: prompt.system,
      user: prompt.user,
    });

    return ok(result);
  });
}
