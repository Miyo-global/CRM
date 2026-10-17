import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { atsApplicationQuestions, jobPostings } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { jobCapabilities } from "@/lib/ats/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { QuestionEditor } from "@/features/ats/jobs/question-editor";

export const dynamic = "force-dynamic";

/** MIYO-0635: what this job asks beyond the standard fields. */
export default async function JobFormPage({ params }: { params: Promise<{ jobId: string }> }) {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, userId, member } = authed;

  const jobId = Number((await params).jobId);
  if (!Number.isInteger(jobId)) notFound();

  const capabilities = await jobCapabilities({ userId, orgId, role: member.role }, jobId);
  if (!capabilities.has("manage_job")) notFound();

  const job = await db.query.jobPostings.findFirst({ where: eq(jobPostings.id, jobId) });
  if (!job) notFound();

  const questions = await db
    .select()
    .from(atsApplicationQuestions)
    .where(eq(atsApplicationQuestions.jobId, jobId))
    .orderBy(asc(atsApplicationQuestions.sort));

  return (
    <PageWrapper title={job.title} subtitle="Application form">
      <QuestionEditor
        jobId={jobId}
        initial={questions.map((q) => ({
          id: q.id,
          label: q.label,
          type: q.type,
          options: q.options ?? [],
          required: q.required,
          knockoutEquals:
            typeof (q.knockout as { equals?: string } | null)?.equals === "string"
              ? ((q.knockout as { equals: string }).equals)
              : "",
        }))}
      />
    </PageWrapper>
  );
}
