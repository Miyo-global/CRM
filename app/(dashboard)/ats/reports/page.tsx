import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { timeInStage, timeToHire } from "@/lib/ats/reports";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

function days(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(1)} days` : "—";
}

/** MIYO-0674: how long hiring takes, per job and per stage. */
export default async function AtsReportsPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

  const [perJob, perStage] = await Promise.all([timeToHire(orgId), timeInStage(orgId)]);

  return (
    <PageWrapper
      title="Hiring reports"
      subtitle="Time to hire and time in stage"
      actions={
        <div className="flex gap-3 text-sm">
          <Link href="/ats/reports/sources" className="underline underline-offset-4">
            Sources
          </Link>
          <Link href="/ats/reports/funnel" className="underline underline-offset-4">
            Funnel
          </Link>
        </div>
      }
    >
      <section>
        <h2 className="mb-3 text-base font-medium text-foreground">Time to hire</h2>
        {perJob.length === 0 ? (
          <EmptyState
            title="Nobody hired yet"
            description="This fills in once someone is hired through the pipeline."
          />
        ) : (
          <div className="grid gap-2">
            {perJob.map((row) => (
              <Card key={row.jobId}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <span className="text-foreground">{row.jobTitle}</span>
                  <span className="text-muted-foreground">
                    {row.hires} hired · median {days(row.medianDays)} · average{" "}
                    {days(row.averageDays)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-medium text-foreground">Time in stage</h2>
        {perStage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stage moves recorded yet.</p>
        ) : (
          <div className="grid gap-2">
            {perStage.map((row) => (
              <Card key={row.stage}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <span className="text-foreground">{row.stage}</span>
                  <span className="text-muted-foreground">
                    {row.moves} moves · average {days(row.averageDays)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageWrapper>
  );
}
