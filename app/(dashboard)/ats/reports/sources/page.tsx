import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { isAtsRole } from "@/lib/constants/roles";
import { sourceEffectiveness } from "@/lib/ats/reports";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

/** MIYO-0675: which sources actually produce hires. */
export default async function AtsSourceReportPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, member } = authed;
  if (!isAtsRole(member.role)) notFound();

  const rows = await sourceEffectiveness(orgId);

  return (
    <PageWrapper title="Sources" subtitle="Applications through to hires">
      {rows.length === 0 ? (
        <EmptyState title="No applications yet" description="Sources appear once people apply." />
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => (
            <Card key={row.source}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span className="text-foreground">{row.source}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.applications} applied · {row.interviews} interviewed · {row.offers} offered ·{" "}
                  {row.hires} hired
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
