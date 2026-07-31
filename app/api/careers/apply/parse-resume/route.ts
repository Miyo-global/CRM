import { ok, err } from "@/lib/api/helpers";
import { checkRateLimitRedis } from "@/lib/rate-limit-redis";
import {
  RESUME_ALLOWED_MIME_TYPES,
  RESUME_MAX_FILE_SIZE_BYTES,
  validateResumeFileClient,
  validateResumeFileBuffer,
} from "@/lib/files/resume-file-validation";
import { extractResumeText } from "@/lib/files/extract-resume-text";
import { isAIConfigured, aiInvoke } from "@/lib/ai/openai";
import { z } from "zod";
import type { NextRequest } from "next/server";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

const ParsedResumeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  githubUrl: z.string().nullable(),
  currentRole: z.string().nullable(),
  experienceYears: z.string().nullable(),
  skills: z.array(z.string()),
  education: z.array(
    z.object({
      qualification: z.string(),
      institution: z.string(),
      year: z.string(),
    }),
  ),
  workExperience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      description: z.string(),
    }),
  ),
});

function extractWithRegex(text: string): z.infer<typeof ParsedResumeSchema> {
  const emailMatch = text.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = text.match(/(\+?[\d\s\-().]{7,15}\d)/);
  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})/m);
  const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w\-]+\/?/i);
  const githubMatch = text.match(/https?:\/\/(?:www\.)?github\.com\/[\w\-]+\/?/i);

  return {
    name: nameMatch?.[1] ?? null,
    email: emailMatch?.[1] ?? null,
    phone: phoneMatch?.[1] ?? null,
    location: null,
    linkedinUrl: linkedinMatch?.[0] ?? null,
    githubUrl: githubMatch?.[0] ?? null,
    currentRole: null,
    experienceYears: null,
    skills: [],
    education: [],
    workExperience: [],
  };
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimitRedis("ai", getClientIp(req));
  if (!rl.allowed) {
    return err("Too many requests. Please try again later.", 429);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return err("Invalid request.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return err("No file provided.", 400);
  }

  const clientError = validateResumeFileClient(file);
  if (clientError) return err(clientError, 400);

  if (file.size > RESUME_MAX_FILE_SIZE_BYTES) {
    return err("File too large.", 400);
  }

  if (!(RESUME_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return err("File type not allowed.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = (RESUME_ALLOWED_MIME_TYPES as readonly string[]).find((type) =>
    validateResumeFileBuffer(buffer, type),
  );
  if (!detectedType) {
    return err("File content does not match the allowed resume format.", 400);
  }

  let resumeText: string;
  try {
    resumeText = await extractResumeText(buffer, detectedType);
  } catch {
    return err("Could not read the resume file. Please try a different format.", 422);
  }

  if (!resumeText.trim()) {
    return ok({ parsed: null });
  }

  const truncated = resumeText.slice(0, 12000);

  if (!isAIConfigured()) {
    return ok({ parsed: extractWithRegex(truncated) });
  }

  try {
    const parsed = await aiInvoke({
      model: "fast",
      schema: ParsedResumeSchema,
      schemaName: "parsed_resume",
      system: `You are a resume parser. Extract structured information from resume text.
- Return null for any field not clearly present.
- phone: include country code if shown, otherwise raw digits/format as found.
- experienceYears: total years as a numeric string (e.g. "3", "7.5"), null if not stated.
- startDate / endDate: YYYY-MM format if month+year given, YYYY-01 if year only, "Present" for current roles.
- skills: list individual skills, not categories.
- Keep description for each work experience concise (1–2 sentences).`,
      user: truncated,
    });
    return ok({ parsed });
  } catch {
    return ok({ parsed: extractWithRegex(truncated) });
  }
}
