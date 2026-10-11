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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

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
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden />
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
      ? `${CURRENCY_SYMBOL}${Number(job.salaryMin).toLocaleString(DEFAULT_LOCALE)} – ${CURRENCY_SYMBOL}${Number(job.salaryMax).toLocaleString(DEFAULT_LOCALE)}`
      : job.salaryMin
        ? `From ${CURRENCY_SYMBOL}${Number(job.salaryMin).toLocaleString(DEFAULT_LOCALE)}`
        : `Up to ${CURRENCY_SYMBOL}${Number(job.salaryMax).toLocaleString(DEFAULT_LOCALE)}`);

  return (
    <Card interactive className="group relative cursor-default overflow-hidden">

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-stretch sm:gap-6">
        <Link
          href={detailPath}
          className="group/link flex min-w-0 flex-1 flex-col gap-4 rounded-md outline-none focus-visible:focus-ring"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="font-display text-lg font-bold leading-snug tracking-tight transition-colors group-hover/link:text-brand-text sm:text-xl">
                {formatJobPostingTitle(job.title)}
              </h2>
              {job.location && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {formatJobPostingLocation(job.location)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {typeLabel && (
                <Badge>{typeLabel}</Badge>
              )}
              {applicationsClosed && (
                <StatusPill tone="neutral" dot>
                  Closed
                </StatusPill>
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
              <span className="text-sm font-semibold tabular-nums text-brand-text">{salaryLabel}</span>
            )}
            {job.applicationDeadline && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                {applicationsClosed ? (
                  <>Deadline was {deadlineLabel}</>
                ) : (
                  <>Apply by {deadlineLabel}</>
                )}
              </span>
            )}
          </div>
        </Link>

        <div className="flex shrink-0 flex-col justify-center gap-2 border-border sm:w-44 sm:border-l sm:pl-6">
          {!applicationsClosed ? (
            <Button asChild>
              <Link href={applyPath}>
                Apply now
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : (
            <span className="inline-flex h-9 items-center justify-center rounded-md bg-muted px-4 text-sm font-medium text-muted-foreground">
              Applications closed
            </span>
          )}
          <Button asChild variant="outline">
            <Link href={detailPath}>View details</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
