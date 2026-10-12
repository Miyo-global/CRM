import {
  getJobPostingMetadata,
  getJobPostingDetail,
  getDepartmentName,
} from "@/server/queries/public";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  MapPin,
  Clock,
  Briefcase,
  Building2,
  Users,
  CalendarDays,
  ArrowLeft,
} from "lucide-react";
import type { Metadata } from "next";
import { CareersHeader } from "@/features/careers/careers-header";
import { CareersFooter } from "@/features/careers/careers-footer";
import { AboutCompany } from "@/features/careers/about-company";
import { jobPostingPath } from "@/lib/careers/job-slug";
import {
  canAcceptApplications,
  formatDeadlineDisplay,
} from "@/lib/careers/application-deadline";
import {
  formatJobPostingLocation,
  formatJobPostingTitle,
  formatJobTypeLabel,
} from "@/lib/hr/job-posting-format";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";
import { Button } from "@/components/ui/button";

export const revalidate = 300;

function toBulletItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[•\-*–—]\s*/, "").trim())
    .filter(Boolean);
}

function BulletedText({ text }: { text: string }) {
  const items = toBulletItems(text);
  if (items.length <= 1) {
    return (
      <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    );
  }
  return (
    <ul className="space-y-2 text-base text-muted-foreground leading-relaxed">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span
            className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold-400"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

type Props = {
  params: Promise<{ jobId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jobId } = await params;
  const id = Number(jobId);
  if (isNaN(id)) return { title: "Job Not Found" };

  const job = await getJobPostingMetadata(id);
  if (!job) return { title: "Job Not Found" };
  return {
    title: formatJobPostingTitle(job.title),
    description: `${formatJobPostingTitle(job.title)}${job.location ? ` · ${formatJobPostingLocation(job.location)}` : ""} — Apply at Miyo Global`,
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { jobId } = await params;
  const id = Number(jobId);
  if (isNaN(id)) notFound();

  const job = await getJobPostingDetail(id);
  if (!job) notFound();

  const deptName = job.departmentId
    ? await getDepartmentName(job.departmentId)
    : null;

  const typeLabel = job.type ? formatJobTypeLabel(job.type) : null;
  const displayTitle = formatJobPostingTitle(job.title);
  const displayLocation = job.location ? formatJobPostingLocation(job.location) : null;
  const hasSalary = job.salaryMin !== null || job.salaryMax !== null;
  const acceptingApplications = canAcceptApplications("OPEN", job.applicationDeadline);
  const deadlineLabel = formatDeadlineDisplay(job.applicationDeadline);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CareersHeader backHref="/careers" backLabel="All jobs" />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/careers"
          className="mb-6 inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:focus-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to all openings
        </Link>

        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {displayTitle}
            </h1>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
              {deptName && (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5">
                  <Building2 className="size-3.5 shrink-0" aria-hidden />
                  {deptName}
                </span>
              )}
              {displayLocation && (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  {displayLocation}
                </span>
              )}
              {typeLabel && (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-brand-soft px-2.5 text-brand-soft-foreground">
                  <Clock className="size-3.5 shrink-0" aria-hidden />
                  {typeLabel}
                </span>
              )}
              {job.experience && (
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5">
                  <Briefcase className="size-3.5 shrink-0" aria-hidden />
                  {job.experience}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="relative size-8 shrink-0">
                <Image
                  src="/logo.svg"
                  alt="Miyo Global"
                  fill
                  className="object-contain"
                />
              </div>
              <h3 className="text-lg font-semibold">Job details</h3>
            </div>

            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {typeLabel && (
                <div>
                  <dt className="mb-0.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Employment type
                  </dt>
                  <dd className="font-medium">{typeLabel}</dd>
                </div>
              )}
              {displayLocation && (
                <div>
                  <dt className="mb-0.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Location
                  </dt>
                  <dd className="font-medium">{displayLocation}</dd>
                </div>
              )}
              {job.experience && (
                <div>
                  <dt className="mb-0.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Experience
                  </dt>
                  <dd className="font-medium">{job.experience}</dd>
                </div>
              )}
              {hasSalary && (
                <div>
                  <dt className="mb-0.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Salary range
                  </dt>
                  <dd className="font-semibold tabular-nums text-brand-text">
                    {job.salaryMin && job.salaryMax
                      ? `${CURRENCY_SYMBOL}${Number(job.salaryMin).toLocaleString(DEFAULT_LOCALE)} – ${CURRENCY_SYMBOL}${Number(job.salaryMax).toLocaleString(DEFAULT_LOCALE)}`
                      : job.salaryMin
                        ? `From ${CURRENCY_SYMBOL}${Number(job.salaryMin).toLocaleString(DEFAULT_LOCALE)}`
                        : `Up to ${CURRENCY_SYMBOL}${Number(job.salaryMax).toLocaleString(DEFAULT_LOCALE)}`}
                  </dd>
                </div>
              )}
              {job.openings && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-3.5 shrink-0" aria-hidden />
                  <span>
                    {job.openings} opening{job.openings !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {job.applicationDeadline && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0" aria-hidden />
                  <span>
                    {acceptingApplications
                      ? `Apply by ${deadlineLabel}`
                      : `Applications closed — deadline was ${deadlineLabel}`}
                  </span>
                </div>
              )}
            </dl>

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Posted{" "}
                {job.createdAt
                  ? new Date(job.createdAt).toLocaleDateString(DEFAULT_LOCALE, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "recently"}
              </p>
              {acceptingApplications ? (
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href={`${jobPostingPath(job.id, job.title)}/apply`}>
                    Apply now
                  </Link>
                </Button>
              ) : (
                <div
                  className="inline-flex h-11 w-full items-center justify-center rounded-md bg-muted px-5 text-sm font-semibold text-muted-foreground sm:w-auto"
                  aria-live="polite"
                >
                  Applications closed
                </div>
              )}
            </div>
          </div>

          {job.description && (
            <section className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
              <h2 className="mb-3 font-display text-lg font-bold">About this role</h2>
              <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>
            </section>
          )}

          {job.requirements && (
            <section className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
              <h2 className="mb-3 font-display text-lg font-bold">Requirements</h2>
              <BulletedText text={job.requirements} />
            </section>
          )}

          {job.benefits && (
            <section className="rounded-lg border border-border bg-card p-5 shadow-xs sm:p-6">
              <h2 className="mb-3 font-display text-lg font-bold">Benefits</h2>
              <BulletedText text={job.benefits} />
            </section>
          )}

          <AboutCompany />
        </div>
      </main>

      <CareersFooter />
    </div>
  );
}
