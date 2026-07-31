import "server-only";

import { aiInvoke, isOpenAIConfigured } from "./openai";
import {
  emailGeneratorPrompt,
  type EmailGeneratorInput,
  type EmailTone,
  type GeneratedEmail,
} from "./prompts";
import { GeneratedEmailSchema } from "./schemas";

export async function generateFollowUpEmail(
  input: EmailGeneratorInput,
): Promise<GeneratedEmail | null> {
  if (!isOpenAIConfigured()) return null;

  const prompt = emailGeneratorPrompt(input);

  return aiInvoke({
    model: "fast",
    schema: GeneratedEmailSchema,
    schemaName: "generated_email",
    system: prompt.system,
    user: prompt.user,
  });
}

export async function generateEmailVariations(
  input: Omit<EmailGeneratorInput, "tone">,
  tones: EmailTone[] = ["formal", "friendly", "urgent"],
): Promise<Record<EmailTone, GeneratedEmail>> {
  const results = {} as Record<EmailTone, GeneratedEmail>;

  for (const tone of tones) {
    const email = await generateFollowUpEmail({ ...input, tone });
    if (email) results[tone] = email;
  }

  return results;
}
