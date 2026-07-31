import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isOpenAIConfigured, aiInvoke } from "@/lib/ai/openai";
import { z } from "zod";

const RequestSchema = z.object({
  campaignContext: z.string().min(1).max(2000),
  targetAudience: z.string().max(300).optional(),
  tone: z.enum(["professional", "friendly", "urgent", "curiosity"]).optional(),
  count: z.number().int().min(3).max(10).optional(),
});

const SubjectLinesSchema = z.object({
  subjects: z.array(z.string()).min(3).max(10),
});


export async function POST(req: NextRequest) {
  return withAuth(async () => {
    if (!isOpenAIConfigured()) {
      return err("AI features are not configured. Set OPENAI_API_KEY.", 503);
    }

    const { campaignContext, targetAudience, tone, count } = await parseBody(req, RequestSchema);

    const numSubjects = count ?? 5;

    const userPrompt = [
      `Campaign Context: ${campaignContext}`,
      targetAudience ? `Target Audience: ${targetAudience}` : null,
      tone ? `Tone: ${tone}` : null,
      `Generate exactly ${numSubjects} email subject line variations.`,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await aiInvoke({
      model: "fast",
      schema: SubjectLinesSchema,
      schemaName: "subject_lines",
      system:
        "You are an expert email marketer specializing in B2B financial services campaigns for the Indian market. " +
        "Generate compelling, high-converting email subject lines that resonate with Indian investors and professionals. " +
        "Each subject line should be concise (under 60 characters), attention-grabbing, and relevant to the campaign context.",
      user: userPrompt,
    });

    return ok(result);
  });
}
