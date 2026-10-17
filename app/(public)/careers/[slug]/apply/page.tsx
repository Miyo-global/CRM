import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { atsApplicationQuestions } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { getCareersJobBySlug, getCareersOrg, jobIsOpen } from "@/lib/ats/careers";
import { ApplyForm } from "@/features/ats/careers/apply-form";

export const metadata: Metadata = {
  title: "Apply",
  robots: { index: false, follow: true },
};

/** MIYO-0639: the application form for one role. */
export default async function ApplyPage({ params }: { params: Promise<{ slug: string }> }) {
  if (!ATS_MODULE_ENABLED) notFound();

  const org = await getCareersOrg();
  if (!org) notFound();

  const { slug } = await params;
  const job = await getCareersJobBySlug(org.id, slug);
  if (!job) notFound();

  if (!jobIsOpen(job)) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-foreground">This role is closed</h1>
        <p className="mt-2 text-muted-foreground">
          <Link href="/careers" className="underline underline-offset-4">
            See what is open
          </Link>
          .
        </p>
      </main>
    );
  }

  const questions = await db
    .select({
      id: atsApplicationQuestions.id,
      label: atsApplicationQuestions.label,
      type: atsApplicationQuestions.type,
      options: atsApplicationQuestions.options,
      required: atsApplicationQuestions.required,
    })
    .from(atsApplicationQuestions)
    .where(eq(atsApplicationQuestions.jobId, job.id))
    .orderBy(asc(atsApplicationQuestions.sort));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <Link
        href={`/careers/${job.slug}`}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Back to the role
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-foreground">Apply: {job.title}</h1>
      <p className="mt-2 text-muted-foreground">
        {[job.departmentName, job.location].filter(Boolean).join(" · ")}
      </p>

      <ApplyForm
        jobId={job.id}
        questions={questions}
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      />
    </main>
  );
}
