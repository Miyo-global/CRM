"use client";

import { use } from "react";
import { JobOpeningForm } from "@/features/hr/recruitment/job-opening-form";

export default function EditJobOpeningPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const id = Number(jobId);
  return <JobOpeningForm jobId={Number.isFinite(id) && id > 0 ? id : undefined} />;
}
