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
      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    );
  }
  return (
    <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span
            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60"
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
    <div className="min-h-screen flex flex-col noir-mesh">
      <CareersHeader backHref="/careers" backLabel="All jobs" />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/careers"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all openings
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="rounded-2xl border bg-card/80 p-6 sm:p-8 shadow-soft">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {displayTitle}
              </h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {deptName && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 shrink-0 text-primary/70" />
                    {deptName}
                  </span>
                )}
                {displayLocation && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                    {displayLocation}
                  </span>
                )}
                {typeLabel && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0 text-primary/70" />
                    {typeLabel}
                  </span>
                )}
                {job.experience && (
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 shrink-0 text-primary/70" />
                    {job.experience}
                  </span>
                )}
              </div>
            </div>

            <AboutCompany />

            {job.description && (
              <section className="rounded-xl border bg-card/60 p-6">
                <h2 className="text-base font-semibold mb-3">About this role</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {job.description}
                </div>
              </section>
            )}

            {job.requirements && (
              <section className="rounded-xl border bg-card/60 p-6">
                <h2 className="text-base font-semibold mb-3">Requirements</h2>
                <BulletedText text={job.requirements} />
              </section>
            )}

            {job.benefits && (
              <section className="rounded-xl border bg-card/60 p-6">
                <h2 className="text-base font-semibold mb-3">Benefits</h2>
                <BulletedText text={job.benefits} />
              </section>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border bg-card p-6 space-y-5 shadow-gold ring-1 ring-primary/10">
              <div className="flex items-center gap-3 pb-1 border-b border-border/60">
                <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-primary/10 ring-1 ring-primary/20 shrink-0">
                  <Image
                    src="/logo.svg"
                    alt="Miyo Global"
                    fill
                    className="object-contain p-1.5"
                  />
                </div>
                <h3 className="text-sm font-semibold">Job details</h3>
              </div>

              <dl className="space-y-4 text-sm">
                {typeLabel && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Employment type
                    </dt>
                    <dd className="font-medium">{typeLabel}</dd>
                  </div>
                )}
                {displayLocation && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Location
                    </dt>
                    <dd className="font-medium">{displayLocation}</dd>
                  </div>
                )}
                {job.experience && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Experience
                    </dt>
                    <dd className="font-medium">{job.experience}</dd>
                  </div>
                )}
                {hasSalary && (
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      Salary range
                    </dt>
                    <dd className="font-semibold text-primary">
                      {job.salaryMin && job.salaryMax
                        ? `₹${Number(job.salaryMin).toLocaleString("en-IN")} – ₹${Number(job.salaryMax).toLocaleString("en-IN")}`
                        : job.salaryMin
                          ? `From ₹${Number(job.salaryMin).toLocaleString("en-IN")}`
                          : `Up to ₹${Number(job.salaryMax).toLocaleString("en-IN")}`}
                    </dd>
                  </div>
                )}
                {job.openings && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {job.openings} opening{job.openings !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {job.applicationDeadline && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {acceptingApplications
                        ? `Apply by ${deadlineLabel}`
                        : `Applications closed — deadline was ${deadlineLabel}`}
                    </span>
                  </div>
                )}
              </dl>

              {acceptingApplications ? (
                <Link
                  href={`${jobPostingPath(job.id, job.title)}/apply`}
                  className="press-scale block w-full text-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-gold hover:bg-primary/90 transition-colors"
                >
                  Apply now
                </Link>
              ) : (
                <div
                  className="block w-full text-center rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm font-semibold text-muted-foreground"
                  aria-live="polite"
                >
                  Applications closed
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Posted{" "}
              {job.createdAt
                ? new Date(job.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "recently"}
            </p>
          </div>
        </div>
      </main>

      <CareersFooter />
    </div>
  );
}
