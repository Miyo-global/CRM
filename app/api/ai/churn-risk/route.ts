import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { analyzeChurnRisk } from "@/lib/ai/churn-risk";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { z } from "zod";

const schema = z.object({
  clientId: z.number().int().positive(),
  openTickets: z.number().optional(),
  ticketsLast90Days: z.number().optional(),
  daysSinceLastActivity: z.number().nullable().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI is not configured. Set OPENAI_API_KEY.", 503);
    }

    const input = await parseBody(req, schema);
    const result = await analyzeChurnRisk(session.orgId, input.clientId, {
      openTickets: input.openTickets,
      ticketsLast90Days: input.ticketsLast90Days,
      daysSinceLastActivity: input.daysSinceLastActivity,
    });

    if (!result) return err("Client not found or analysis failed", 404);
    return ok(result);
  });
}
