import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { funnel } from "@/lib/ats/reports";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { FunnelFilters } from "@/features/ats/reports/funnel-filters";

export const dynamic = "force-dynamic";

/** MIYO-0676: how many are left at each stage, and what fell away. */
export default async function AtsFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string; from?: string; to?: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

  const query = await searchParams;
  const jobId = Number(query.jobId);
  const from = query.from && !Number.isNaN(Date.parse(query.from)) ? new Date(query.from) : undefined;
  const to = query.to && !Number.isNaN(Date.parse(query.to)) ? new Date(query.to) : undefined;

  const [jobs, rows] = await Promise.all([
    db
      .select({ id: jobPostings.id, title: jobPostings.title })
      .from(jobPostings)
      .where(and(eq(jobPostings.orgId, orgId)))
      .orderBy(asc(jobPostings.title)),
    funnel(orgId, {
      jobId: Number.isInteger(jobId) && jobId > 0 ? jobId : undefined,
      from,
      to,
    }),
  ]);

  const top = rows[0]?.candidates ?? 0;

  return (
    <PageWrapper title="Funnel" subtitle="Where candidates are, stage by stage">
      <FunnelFilters jobs={jobs} rows={rows} />

      <div className="mt-6 grid gap-2">
        {rows.map((row) => (
          <Card key={row.stage}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <span className="text-foreground">{row.stage}</span>
              <span className="text-muted-foreground tabular-nums">
                {row.candidates}
                {top > 0 && ` · ${Math.round((row.candidates / top) * 100)}% of applied`}
              </span>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No stages configured yet.</p>
        )}
      </div>
    </PageWrapper>
  );
}
