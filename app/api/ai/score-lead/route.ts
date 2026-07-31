import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { aiScoreLead, aiBatchScoreLeads } from "@/lib/ai/lead-scoring";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { z } from "zod";

const singleSchema = z.object({
  leadId: z.number().int().positive(),
});

const batchSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1).max(50),
});

export async function POST(req: NextRequest) {
  return withAuth<unknown>(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI scoring is not configured. Set OPENAI_API_KEY.", 503);
    }

    const body = await req.json();

    if (Array.isArray(body.leadIds)) {
      const { leadIds } = batchSchema.parse(body);
      const results = await aiBatchScoreLeads(session.orgId, leadIds);
      const mapped = Object.fromEntries(results.entries());
      return ok({ results: mapped, scored: results.size });
    }

    const { leadId } = singleSchema.parse(body);
    const result = await aiScoreLead(session.orgId, leadId);

    if (!result) {
      return err("Lead not found or scoring failed", 404);
    }

    return ok(result);
  });
}
