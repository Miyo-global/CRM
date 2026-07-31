import { getJobPostingDetail } from "@/server/queries/public";
import { notFound } from "next/navigation";
import {
  canAcceptApplications,
  isApplicationDeadlinePassed,
} from "@/lib/careers/application-deadline";
import { CareersApplyForm } from "@/features/careers/careers-apply-form";
import { CareersApplicationsClosed } from "@/features/careers/careers-applications-closed";

type Props = {
  params: Promise<{ jobId: string }>;
};

export default async function ApplyPage({ params }: Props) {
  const { jobId: jobIdParam } = await params;
  const jobId = Number(jobIdParam);
  if (Number.isNaN(jobId)) notFound();

  const job = await getJobPostingDetail(jobId);
  if (!job) notFound();

  if (!canAcceptApplications("OPEN", job.applicationDeadline)) {
    return (
      <CareersApplicationsClosed
        jobId={job.id}
        jobTitle={job.title}
        applicationDeadline={job.applicationDeadline}
      />
    );
  }

  return <CareersApplyForm jobId={job.id} jobTitle={job.title} applicationFields={job.applicationFields ?? undefined} />;
}
