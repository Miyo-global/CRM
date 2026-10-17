import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import {
  atsActivity,
  atsApplicationAnswers,
  atsApplicationQuestions,
  atsConsents,
  atsJobMembers,
  candidateApplications,
  candidates,
  jobPostings,
  users,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/ats/turnstile";
import { normalisePhone } from "@/lib/ats/phone";
import { findDuplicates } from "@/lib/ats/duplicates";
import { jobIsOpen } from "@/lib/ats/careers";
import { firstStageId } from "@/lib/ats/stages";
import { sendApplicationEmails } from "@/lib/ats/application-emails";
import {
  applyFieldsSchema,
  CONSENT_TEXT_VERSION,
  TALENT_POOL_MONTHS,
} from "@/lib/validations/ats-apply";
import {
  RESUME_MAX_FILE_SIZE_BYTES,
  validateResumeFileBuffer,
} from "@/lib/files/resume-file-validation";
import { extractResumeText } from "@/lib/files/extract-resume-text";
import { uploadFile } from "@/lib/storage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * MIYO-0639: the public apply endpoint. Multipart, because the resume comes
 * with it. MIYO-0640 guards it: honeypot, Turnstile where configured, and
 * five an hour per IP and per email address.
 */
export async function POST(req: NextRequest) {
  if (!ATS_MODULE_ENABLED) return bad("Applications are closed.", 404);

  const ip = clientIp(req);
  const ipLimit = await checkRateLimit("ats-apply", ip);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many applications from here. Try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSecs) } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Send the application as a form.");
  }

  try {
    const raw = Object.fromEntries(form.entries());
    const fields = applyFieldsSchema.parse({
      ...raw,
      consent: raw.consent === "true" || raw.consent === "on",
      talentPool: raw.talentPool === "true" || raw.talentPool === "on",
      answers: raw.answers ? JSON.parse(String(raw.answers)) : undefined,
    });

    // The honeypot is hidden from people; anything in it is a bot.
    if (fields.website) return bad("Application rejected.");

    if (!(await verifyTurnstile(form.get("turnstileToken")?.toString(), ip))) {
      return bad("Could not verify you are human. Reload the page and try again.");
    }

    const emailLimit = await checkRateLimit("ats-apply", `email:${fields.email}`);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        { error: "You have applied several times already. Try again later." },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSecs) } },
      );
    }

    const job = await db.query.jobPostings.findFirst({
      where: eq(jobPostings.id, fields.jobId),
    });
    if (!job || !jobIsOpen({ status: job.status, closesAt: job.closesAt })) {
      return bad("This role is no longer taking applications.", 410);
    }

    const resume = form.get("resume");
    if (!(resume instanceof File) || resume.size === 0) return bad("Attach your resume.");
    if (resume.size > RESUME_MAX_FILE_SIZE_BYTES) return bad("Resume must be under 5MB.");

    const buffer = Buffer.from(await resume.arrayBuffer());
    if (!validateResumeFileBuffer(buffer, resume.type)) {
      return bad("Only PDF or Word (.doc, .docx) resumes are accepted.");
    }

    // Knockout questions decide before anything is written.
    const questions = await db
      .select()
      .from(atsApplicationQuestions)
      .where(eq(atsApplicationQuestions.jobId, job.id));
    for (const question of questions) {
      const answer = fields.answers?.[String(question.id)];
      if (question.required && (answer === undefined || answer === "")) {
        return bad(`Answer "${question.label}".`);
      }
      const knockout = question.knockout as
        | { equals?: string; notEquals?: string; min?: number }
        | null;
      if (!knockout || answer === undefined) continue;
      const failed =
        (knockout.equals !== undefined && String(answer) !== knockout.equals) ||
        (knockout.notEquals !== undefined && String(answer) === knockout.notEquals) ||
        (knockout.min !== undefined && Number(answer) < knockout.min);
      if (failed) {
        return bad("Thanks for your interest — this role needs something different.", 422);
      }
    }

    const upload = await uploadFile(buffer, "resumes", resume.name, resume.type, job.orgId);
    // MIYO-0642: the text feeds the candidates.search tsvector. Extraction
    // failing must never cost someone their application.
    const resumeText = await extractResumeText(buffer, resume.type).catch((error) => {
      logger.error("Resume text extraction failed", { fileName: resume.name, error });
      return "";
    });

    // MIYO-0644: one candidate row per person. An email match is the same
    // person; a phone or LinkedIn match is only flagged for the recruiter.
    const matches = await findDuplicates(job.orgId, {
      email: fields.email,
      phone: fields.phone,
      linkedinUrl: fields.linkedinUrl || null,
    });
    const emailMatch = matches.find((m) => m.matchedOn === "email");
    const existing = emailMatch
      ? await db.query.candidates.findFirst({ where: eq(candidates.id, emailMatch.id) })
      : undefined;
    const softMatch = emailMatch ? undefined : matches[0];

    const candidateValues = {
      firstName: fields.firstName,
      lastName: fields.lastName,
      phone: fields.phone,
      phoneNormalized: normalisePhone(fields.phone),
      linkedinUrl: fields.linkedinUrl || null,
      resumeUrl: upload.key,
      resumeText: resumeText || null,
      source: "CAREERS",
    };

    const candidate = existing
      ? (
          await db
            .update(candidates)
            .set(candidateValues)
            .where(eq(candidates.id, existing.id))
            .returning()
        )[0]
      : (
          await db
            .insert(candidates)
            .values({
              ...candidateValues,
              orgId: job.orgId,
              email: fields.email,
              duplicateOfId: softMatch?.id ?? null,
            })
            .returning()
        )[0];

    const alreadyApplied = await db.query.candidateApplications.findFirst({
      where: and(
        eq(candidateApplications.candidateId, candidate.id),
        eq(candidateApplications.jobPostingId, job.id),
      ),
    });
    if (alreadyApplied) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const [application] = await db
      .insert(candidateApplications)
      .values({
        orgId: job.orgId,
        candidateId: candidate.id,
        jobPostingId: job.id,
        coverLetter: fields.coverLetter || null,
        source: "CAREERS",
        stageId: await firstStageId(job.orgId, job.id),
      })
      .returning();

    const answers = Object.entries(fields.answers ?? {})
      .filter(([questionId]) => questions.some((q) => String(q.id) === questionId))
      .map(([questionId, value]) => ({
        applicationId: application.id,
        questionId: Number(questionId),
        value,
      }));
    if (answers.length > 0) {
      await db.insert(atsApplicationAnswers).values(answers).onConflictDoNothing();
    }

    const talentPoolExpiry = new Date();
    talentPoolExpiry.setMonth(talentPoolExpiry.getMonth() + TALENT_POOL_MONTHS);

    await db.insert(atsConsents).values([
      {
        candidateId: candidate.id,
        type: "PROCESSING",
        textVersion: CONSENT_TEXT_VERSION,
        ip,
      },
      // MIYO-0678: the optional one. It expires, and the retention sweep
      // reads that expiry.
      ...(fields.talentPool
        ? [
            {
              candidateId: candidate.id,
              type: "TALENT_POOL",
              textVersion: CONSENT_TEXT_VERSION,
              ip,
              expiresAt: talentPoolExpiry,
            },
          ]
        : []),
    ]);

    await db.insert(atsActivity).values({
      orgId: job.orgId,
      candidateId: candidate.id,
      applicationId: application.id,
      type: "applied",
      data: { jobId: job.id, source: "CAREERS" },
    });

    const team = await db
      .select({ email: users.email })
      .from(atsJobMembers)
      .innerJoin(users, eq(users.id, atsJobMembers.userId))
      .where(eq(atsJobMembers.jobId, job.id));

    try {
      await sendApplicationEmails({
        candidate: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
        },
        job: { id: job.id, title: job.title, slug: job.slug, location: job.location },
        teamEmails: team.map((t) => t.email),
        isRepeatCandidate: Boolean(existing || softMatch),
        orgId: job.orgId,
      });
    } catch (error) {
      logger.error("Application emails failed", { applicationId: application.id, error });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof ZodError) return bad(e.issues[0]?.message ?? "Check the form.");
    logger.error("Public application failed", { error: e });
    return bad("Something went wrong. Please try again.", 500);
  }
}
