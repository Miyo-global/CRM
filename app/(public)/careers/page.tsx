import {
  listOpenJobPostings,
  listDepartmentsByIds,
  type PublicJobPosting,
} from "@/server/queries/public";
import { Briefcase, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { CareersHeader } from "@/features/careers/careers-header";
import { CareersFooter } from "@/features/careers/careers-footer";
import { CareersJobList } from "@/features/careers/careers-job-list";
import { canAcceptApplications } from "@/lib/careers/application-deadline";
import { IconChip } from "@/components/ui/icon-chip";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Explore open positions at Miyo Global. Join our team of driven professionals.",
};

export default async function CareersPage() {
  let jobs: PublicJobPosting[] = [];
  let deptMap = new Map<number, string>();

  try {
    jobs = await listOpenJobPostings();
    const departmentIds = [
      ...new Set(
        jobs.map((j) => j.departmentId).filter((id): id is number => id !== null)
      ),
    ];
    deptMap = await listDepartmentsByIds(departmentIds);
  } catch {
    // Public page: show empty state if DB unavailable
  }

  const openForApplications = jobs.filter((j) =>
    canAcceptApplications("OPEN", j.applicationDeadline),
  ).length;

  const jobItems = jobs.map((job) => ({
    job,
    departmentName: job.departmentId ? deptMap.get(job.departmentId) ?? null : null,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CareersHeader backHref="/" backLabel="Back to site" />

      <section className="brand-mark-bg relative overflow-hidden">

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left space-y-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar-accent px-3 py-1 text-xs font-semibold text-gold-300">
                <Sparkles className="size-3.5" aria-hidden />
                We&apos;re hiring
              </span>

              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-sidebar-accent-foreground sm:text-4xl">
                Join{" "}
                <span className="text-gold-400">Miyo Global</span>
              </h1>

              <p className="text-sidebar-foreground text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
                We&apos;re building the future of capital markets. Explore open
                roles and grow your career with a team that moves fast and cares
                deeply.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <span className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold tabular-nums text-primary-foreground">
                  {openForApplications} open position{openForApplications !== 1 ? "s" : ""}
                </span>
                <span className="text-sm text-sidebar-muted">
                  Updated regularly
                </span>
              </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-12">
        {jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong bg-card py-16 text-center sm:py-24">
            <IconChip icon={Briefcase} tone="neutral" size="lg" className="mx-auto mb-5" />
            <p className="font-display text-lg font-bold">No open positions right now</p>
            <p className="text-base text-muted-foreground mt-2 max-w-sm mx-auto">
              Check back soon — we&apos;re always growing and new roles open up
              frequently.
            </p>
          </div>
        ) : (
          <CareersJobList items={jobItems} />
        )}
      </main>

      <CareersFooter />
    </div>
  );
}
