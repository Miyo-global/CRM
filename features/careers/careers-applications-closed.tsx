import Link from "next/link";
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
    <div className="min-h-screen flex flex-col noir-mesh">
      <CareersHeader
        backHref={jobPostingPath(jobId, jobTitle)}
        backLabel="Back to job"
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="text-center py-16 rounded-2xl border bg-card/80 shadow-soft px-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-14 w-14 text-muted-foreground mx-auto mb-4"
            aria-hidden="true"
          >
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
            <path d="M3 10h18" />
            <path d="m17 22 5-5" />
            <path d="m17 17 5 5" />
          </svg>
          <h1 className="text-xl font-semibold mb-2">Applications closed</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
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
          <Link
            href="/careers"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View other openings
          </Link>
        </div>
      </main>

      <CareersFooter />
    </div>
  );
}
