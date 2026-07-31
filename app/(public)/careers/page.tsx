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
    <div className="min-h-screen flex flex-col noir-mesh">
      <CareersHeader backHref="/" backLabel="Back to site" />

      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-secondary/10 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left space-y-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                We&apos;re hiring
              </span>

              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-tight">
                Join{" "}
                <span className="gold-text">Miyo Global</span>
              </h1>

              <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
                We&apos;re building the future of capital markets. Explore open
                roles and grow your career with a team that moves fast and cares
                deeply.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <span className="inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-gold">
                  {openForApplications} open position{openForApplications !== 1 ? "s" : ""}
                </span>
                <span className="text-sm text-muted-foreground">
                  Updated regularly
                </span>
              </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-12">
        {jobs.length === 0 ? (
          <div className="text-center py-16 sm:py-24 rounded-2xl border border-dashed border-border bg-card/50">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
              <Briefcase className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <p className="text-lg font-semibold">No open positions right now</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
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
