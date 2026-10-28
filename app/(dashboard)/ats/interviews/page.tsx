import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, gte, inArray } from "drizzle-orm";

import { requireAuth } from "@/lib/auth/require-auth";
import { db } from "@/lib/db";
import { candidates, interviews, jobPostings, users } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { atsPageAccess } from "@/lib/ats/page-access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIST } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

/** MIYO-0656: what is coming up. */
export default async function AtsInterviewsPage() {
  if (!ATS_MODULE_ENABLED) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();
  const { orgId, userId, member } = authed;

  const { allowed, jobIds } = await atsPageAccess({ userId, orgId, role: member.role });
  if (!allowed) notFound();

  const rows = await db
    .select({
      id: interviews.id,
      candidateId: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      jobTitle: jobPostings.title,
      type: interviews.type,
      scheduledAt: interviews.scheduledAt,
      duration: interviews.duration,
      result: interviews.result,
      interviewerName: users.name,
    })
    .from(interviews)
    .innerJoin(candidates, eq(candidates.id, interviews.candidateId))
    .leftJoin(jobPostings, eq(jobPostings.id, interviews.jobPostingId))
    .leftJoin(users, eq(users.id, interviews.interviewerId))
    .where(
      and(
        eq(interviews.orgId, orgId),
        jobIds ? inArray(interviews.jobPostingId, jobIds) : undefined,
        // eslint-disable-next-line react-hooks/purity -- async Server Component, rendered per request
        gte(interviews.scheduledAt, new Date(Date.now() - 86_400_000)),
      ),
    )
    .orderBy(asc(interviews.scheduledAt));

  return (
    <PageWrapper title="Interviews" subtitle="Today and ahead, in IST">
      {rows.length === 0 ? (
        <EmptyState
          title="Nothing scheduled"
          description="Schedule a round from a candidate's profile."
        />
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <Link
                    href={`/ats/interviews/${row.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {row.firstName} {row.lastName}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[
                      row.jobTitle,
                      row.type,
                      `${formatIST(row.scheduledAt, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })} IST`,
                      row.interviewerName,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{row.result}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
