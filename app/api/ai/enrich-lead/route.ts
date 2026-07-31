import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { aiInvoke, isOpenAIConfigured } from "@/lib/ai/openai";
import { leadEnrichmentPrompt } from "@/lib/ai/prompts";
import { LeadEnrichmentSchema } from "@/lib/ai/schemas";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().optional(),
  designation: z.string().optional(),
  city: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    if (!isOpenAIConfigured()) return err("AI not configured", 503);

    const input = await parseBody(req, schema);
    const prompt = leadEnrichmentPrompt(input);

    const result = await aiInvoke({
      model: "standard",
      schema: LeadEnrichmentSchema,
      schemaName: "lead_enrichment",
      system: prompt.system,
      user: prompt.user,
    });

    return ok(result);
  });
}
