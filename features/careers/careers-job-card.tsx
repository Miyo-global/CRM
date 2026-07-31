import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";
import { jobPostingPath } from "@/lib/careers/job-slug";
import type { PublicJobPosting } from "@/server/queries/public";
import {
  formatDeadlineDisplay,
  isApplicationDeadlinePassed,
} from "@/lib/careers/application-deadline";
import {
  formatJobPostingLocation,
  formatJobPostingTitle,
  formatJobTypeLabel,
} from "@/lib/hr/job-posting-format";
import { cn } from "@/lib/utils";

type CareersJobCardProps = {
  job: PublicJobPosting;
  departmentName?: string | null;
};

function MetaPill({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
      {children}
    </span>
  );
}

export function CareersJobCard({ job, departmentName }: CareersJobCardProps) {
  const typeLabel = job.type ? formatJobTypeLabel(job.type) : null;
  const hasSalary = job.salaryMin !== null || job.salaryMax !== null;
  const applicationsClosed = isApplicationDeadlinePassed(job.applicationDeadline);
  const deadlineLabel = formatDeadlineDisplay(job.applicationDeadline);
  const detailPath = jobPostingPath(job.id, job.title);
  const applyPath = `${detailPath}/apply`;

  const salaryLabel =
    hasSalary &&
    (job.salaryMin && job.salaryMax
      ? `₹${Number(job.salaryMin).toLocaleString("en-IN")} – ₹${Number(job.salaryMax).toLocaleString("en-IN")}`
      : job.salaryMin
        ? `From ₹${Number(job.salaryMin).toLocaleString("en-IN")}`
        : `Up to ₹${Number(job.salaryMax).toLocaleString("en-IN")}`);

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft transition-all duration-200",
        "hover:border-primary/35 hover:shadow-gold",
      )}
    >
      <div
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/60 via-primary to-primary/40"
        aria-hidden
      />

      <div className="flex flex-col gap-5 p-5 pl-6 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6 sm:pl-7">
        <Link
          href={detailPath}
          className="group/link flex min-w-0 flex-1 flex-col gap-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-xl font-semibold tracking-tight leading-snug transition-colors group-hover/link:text-primary sm:text-[1.35rem]">
                {formatJobPostingTitle(job.title)}
              </h2>
              {job.location && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden />
                  {formatJobPostingLocation(job.location)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {typeLabel && (
                <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {typeLabel}
                </span>
              )}
              {applicationsClosed && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  Closed
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {departmentName && (
              <MetaPill icon={Building2}>{departmentName}</MetaPill>
            )}
            {job.experience && (
              <MetaPill icon={Briefcase}>{job.experience}</MetaPill>
            )}
            {job.openings && job.openings > 1 && (
              <MetaPill icon={Clock}>{job.openings} openings</MetaPill>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {salaryLabel && (
              <span className="text-sm font-semibold text-primary">{salaryLabel}</span>
            )}
            {job.applicationDeadline && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {applicationsClosed ? (
                  <>Deadline was {deadlineLabel}</>
                ) : (
                  <>Apply by {deadlineLabel}</>
                )}
              </span>
            )}
          </div>
        </Link>

        <div className="flex shrink-0 flex-col justify-center gap-2 border-border/60 sm:w-44 sm:border-l sm:pl-6">
          {!applicationsClosed ? (
            <Link
              href={applyPath}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Apply now
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-muted/40 px-4 text-sm font-medium text-muted-foreground">
              Applications closed
            </span>
          )}
          <Link
            href={detailPath}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border/80 bg-background/50 px-4 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-muted/40"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
