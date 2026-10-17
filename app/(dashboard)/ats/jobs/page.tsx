import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { departments, jobPostings } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { atsPageAccess } from "@/lib/ats/page-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIST } from "@/lib/date-utils";
import { pluralise } from "@/lib/format-utils";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Published",
  PAUSED: "On hold",
  CLOSED: "Closed",
  FILLED: "Filled",
};

/** MIYO-0633: the job list. */
export default async function AtsJobsPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, userId, member } = authed;
  const { allowed, jobIds } = await atsPageAccess({ userId, orgId, role: member.role });
  if (!allowed) notFound();
  const rows =
    jobIds?.length === 0
      ? []
      : await db
          .select({
            id: jobPostings.id,
            title: jobPostings.title,
            status: jobPostings.status,
            openings: jobPostings.openings,
            location: jobPostings.location,
            workMode: jobPostings.workMode,
            departmentName: departments.name,
            publishedAt: jobPostings.publishedAt,
            createdAt: jobPostings.createdAt,
          })
          .from(jobPostings)
          .leftJoin(departments, eq(departments.id, jobPostings.departmentId))
          .where(
            and(
              eq(jobPostings.orgId, orgId),
              jobIds ? inArray(jobPostings.id, jobIds) : undefined,
            ),
          )
          .orderBy(desc(jobPostings.createdAt));

  return (
    <PageWrapper
      title="Jobs"
      subtitle="Everything open, on hold and closed"
      actions={
        <Button asChild>
          <Link href="/ats/jobs/new">New job</Link>
        </Button>
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Create a job to start taking applications on the careers site."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <Link
                    href={`/ats/jobs/${row.id}/edit`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      row.departmentName,
                      row.location,
                      pluralise(row.openings ?? 1, "opening"),
                      row.publishedAt
                        ? `published ${formatIST(row.publishedAt, { day: "numeric", month: "short" })} IST`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/ats/jobs/${row.id}/pipeline`}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Pipeline
                  </Link>
                  <Badge variant={row.status === "OPEN" ? "default" : "secondary"}>
                    {STATUS_LABELS[row.status ?? "DRAFT"] ?? row.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
