import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { isOpenAIConfigured, aiInvoke } from "@/lib/ai/openai";

const InputSchema = z.object({
  text: z.string().min(10).max(10000),
  clientName: z.string().max(100).optional(),
});

const SentimentSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative", "critical"]),
  score: z.number().min(0).max(100),
  summary: z.string(),
  riskFactors: z.array(z.string()),
  recommendations: z.array(z.string()),
  churnRisk: z.enum(["low", "medium", "high"]),
});


export async function POST(req: NextRequest) {
  return withAuth(async () => {
    if (!isOpenAIConfigured()) {
      return err("AI features are not configured. Set OPENAI_API_KEY.", 503);
    }

    const body = await req.json();
    const { text, clientName } = InputSchema.parse(body);

    const userPrompt = [
      clientName ? `Client: ${clientName}` : null,
      `\nRecent Client Communications:\n${text}`,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await aiInvoke({
      model: "fast",
      schema: SentimentSchema,
      schemaName: "sentiment_analysis",
      system:
        "You are a customer success analyst for a financial services CRM. Analyze client interaction text and identify sentiment, churn risk, and actionable recommendations. The score (0-100) represents client health: 0 = extremely dissatisfied/critical, 100 = extremely satisfied/promoter. Provide 2-5 risk factors and 3-5 specific, actionable recommendations.",
      user: userPrompt,
    });

    return ok(result);
  });
}
