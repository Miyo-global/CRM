import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { uploadFile, isStorageConfigured } from "@/lib/storage";
import {
  RESUME_ALLOWED_MIME_TYPES,
  RESUME_MAX_FILE_SIZE_BYTES,
  validateResumeFileBuffer,
  validateResumeFileClient,
} from "@/lib/files/resume-file-validation";
import { isApplicationDeadlinePassed } from "@/lib/careers/application-deadline";
import { checkRateLimitRedis } from "@/lib/rate-limit-redis";
import type { NextRequest } from "next/server";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimitRedis("upload", getClientIp(req));
  if (!rl.allowed) {
    return err("Too many requests. Please try again later.", 429);
  }

  if (!isStorageConfigured()) {
    return err("Resume upload is temporarily unavailable. Please try again later.", 503);
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return err("Invalid upload request.", 400);
  }

  const file = formData.get("file");
  const jobPostingIdRaw = formData.get("jobPostingId");

  if (!(file instanceof File)) {
    return err("No resume file provided.", 400);
  }

  const jobPostingId = Number(jobPostingIdRaw);
  if (!Number.isInteger(jobPostingId) || jobPostingId <= 0) {
    return err("Invalid job posting.", 400);
  }

  const clientError = validateResumeFileClient(file);
  if (clientError) {
    return err(clientError, 400);
  }

  if (file.size > RESUME_MAX_FILE_SIZE_BYTES) {
    return err(`Resume must be under ${RESUME_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`, 400);
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

  const [job] = await db
    .select({
      id: jobPostings.id,
      orgId: jobPostings.orgId,
      applicationDeadline: jobPostings.applicationDeadline,
    })
    .from(jobPostings)
    .where(and(eq(jobPostings.id, jobPostingId), eq(jobPostings.status, "OPEN")))
    .limit(1);

  if (!job) {
    return err("Job posting not found or is no longer accepting applications.", 404);
  }

  if (isApplicationDeadlinePassed(job.applicationDeadline)) {
    return err("Applications for this position are closed — the deadline has passed.", 400);
  }

  try {
    const result = await uploadFile(file, "careers/resumes", file.name, detectedType, job.orgId);
    return ok({ url: result.url, fileName: file.name }, 201);
  } catch {
    return err("Failed to upload resume. Please try again.", 500);
  }
}
