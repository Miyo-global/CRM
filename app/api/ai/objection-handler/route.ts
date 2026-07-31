import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isOpenAIConfigured, aiInvoke } from "@/lib/ai/openai";
import { z } from "zod";

const RequestSchema = z.object({
  objection: z.string().min(1).max(2000),
  dealStage: z.string().min(1).max(100),
  productName: z.string().max(200).optional(),
  dealValue: z.string().max(100).optional(),
});

const ObjectionResponseSchema = z.object({
  counterArguments: z.array(z.string()),
  talkingPoints: z.array(z.string()),
  suggestedResponse: z.string(),
});


const OBJECTION_HANDLER_ROLES = new Set(["CEO", "ADMIN", "SALES"]);

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!OBJECTION_HANDLER_ROLES.has(session.user.role ?? "")) {
      return err("You do not have access to the objection handler.", 403);
    }
    if (!isOpenAIConfigured()) {
      return err("AI features are not configured. Set OPENAI_API_KEY.", 503);
    }

    const { objection, dealStage, productName, dealValue } = await parseBody(req, RequestSchema);

    const userPrompt = [
      `Client Objection: "${objection}"`,
      `Deal Stage: ${dealStage}`,
      productName ? `Product/Service: ${productName}` : null,
      dealValue ? `Deal Value: ${dealValue}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await aiInvoke({
      model: "fast",
      schema: ObjectionResponseSchema,
      schemaName: "objection_response",
      system:
        "You are an expert B2B sales coach helping Indian investment firm sales reps overcome objections. " +
        "Provide practical, culturally-aware counter-arguments. " +
        "Return 3-5 counter arguments, 3-5 talking points, and a concise suggested response script.",
      user: userPrompt,
    });

    return ok(result);
  });
}
