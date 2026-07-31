import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { generateFollowUpEmail, generateEmailVariations } from "@/lib/ai/email-generator";
import { isOpenAIConfigured } from "@/lib/ai/openai";
import { z } from "zod";
import type { EmailTone } from "@/lib/ai/prompts";

const generateSchema = z.object({
  leadName: z.string().min(1),
  company: z.string().optional(),
  designation: z.string().optional(),
  dealStage: z.string().optional(),
  lastActivityType: z.string().optional(),
  lastActivityDate: z.string().optional(),
  lastActivityNotes: z.string().optional(),
  potentialValue: z.string().optional(),
  tone: z.enum(["formal", "friendly", "urgent"]).default("friendly"),
  context: z.string().optional(),
  allVariations: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  return withAuth<unknown>(async (session) => {
    if (!isOpenAIConfigured()) {
      return err("AI email generation is not configured. Set OPENAI_API_KEY.", 503);
    }

    const input = await parseBody(req, generateSchema);
    const senderName = session.user.name || "Sales Team";
    const senderRole = session.user.role || undefined;

    if (input.allVariations) {
      const results = await generateEmailVariations({
        leadName: input.leadName,
        company: input.company,
        designation: input.designation,
        dealStage: input.dealStage,
        lastActivityType: input.lastActivityType,
        lastActivityDate: input.lastActivityDate,
        lastActivityNotes: input.lastActivityNotes,
        potentialValue: input.potentialValue,
        senderName,
        senderRole,
        context: input.context,
      });

      return ok({ variations: results });
    }

    const email = await generateFollowUpEmail({
      leadName: input.leadName,
      company: input.company,
      designation: input.designation,
      dealStage: input.dealStage,
      lastActivityType: input.lastActivityType,
      lastActivityDate: input.lastActivityDate,
      lastActivityNotes: input.lastActivityNotes,
      potentialValue: input.potentialValue,
      senderName,
      senderRole,
      tone: input.tone as EmailTone,
      context: input.context,
    });

    if (!email) {
      return err("Email generation failed", 500);
    }

    return ok(email);
  });
}
