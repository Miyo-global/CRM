import "server-only";

import { type NextRequest } from "next/server";
import { z } from "zod";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { isOpenAIConfigured, aiText } from "@/lib/ai/openai";
import { isAdminOrOwner } from "@/lib/auth/role-guards";

const BodySchema = z.object({
  data: z.string().min(1).max(10000),
  context: z.string().max(500).optional(),
});


export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("You do not have access to report narration.", 403);
    }
    if (!isOpenAIConfigured()) {
      return err("AI features are not configured. Set OPENAI_API_KEY.", 503);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return err("Invalid JSON body", 400);
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
    }

    const { data, context } = parsed.data;

    const narrative = await aiText({
      model: "fast",
      system:
        "You are a business analyst who writes clear, insightful plain-English narratives from raw data for an Indian investment and financial services firm. Focus on key trends, notable changes, and actionable insights. Keep it concise (2-3 paragraphs). Use relevant financial context and terminology appropriate for the Indian market when applicable.",
      user: `Context: ${context ?? "Business performance data"}

Data:
${data}`,
    });

    return ok({ narrative, generatedAt: new Date().toISOString() });
  });
}
