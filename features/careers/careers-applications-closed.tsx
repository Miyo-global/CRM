import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { CareersHeader } from "@/features/careers/careers-header";
import { CareersFooter } from "@/features/careers/careers-footer";
import { jobPostingPath } from "@/lib/careers/job-slug";
import { formatDeadlineDisplay } from "@/lib/careers/application-deadline";

type CareersApplicationsClosedProps = {
  jobId: number;
  jobTitle: string;
  applicationDeadline?: string | null;
};

export function CareersApplicationsClosed({
  jobId,
  jobTitle,
  applicationDeadline,
}: CareersApplicationsClosedProps) {
  const deadlineLabel = formatDeadlineDisplay(applicationDeadline);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CareersHeader
        backHref={jobPostingPath(jobId, jobTitle)}
        backLabel="Back to job"
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="rounded-xl border border-border bg-card px-6 py-16 text-center shadow-sm">
          <IconChip icon={CalendarX2} tone="neutral" size="lg" className="mx-auto mb-4" />
          <h1 className="mb-2 font-display text-xl font-bold">Applications closed</h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto leading-relaxed">
            Applications for <strong className="text-foreground">{jobTitle}</strong> are no
            longer being accepted
            {deadlineLabel ? (
              <>
                {" "}
                — the deadline was <strong className="text-foreground">{deadlineLabel}</strong>.
              </>
            ) : (
              "."
            )}
          </p>
          <Button asChild className="mt-6">
            <Link href="/careers">View other openings</Link>
          </Button>
        </div>
      </main>

      <CareersFooter />
    </div>
  );
}
