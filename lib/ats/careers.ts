import "server-only";

import { and, asc, desc, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { departments, jobPostings, organizations } from "@/lib/db/schema";
import { CAREERS_JOBS_TAG } from "./careers-cache";

export interface CareersOrg {
  id: string;
  name: string;
  logo: string | null;
}

export interface CareersJob {
  id: number;
  slug: string;
  title: string;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  departmentName: string | null;
  salaryMin: string | null;
  salaryMax: string | null;
  salaryVisible: boolean;
  publishedAt: Date | null;
}

/**
 * MIYO-0637: whose careers page this is. One deployment serves one company,
 * so the org is named by NEXT_PUBLIC_CAREERS_ORG_SLUG where there is more
 * than one; otherwise it is simply the first org.
 */
export const getCareersOrg = unstable_cache(
  async (): Promise<CareersOrg | null> => {
    const slug = process.env.NEXT_PUBLIC_CAREERS_ORG_SLUG;
    const rows = await db
      .select({ id: organizations.id, name: organizations.name, logo: organizations.logo })
      .from(organizations)
      .where(slug ? eq(organizations.slug, slug) : undefined)
      .orderBy(asc(organizations.id))
      .limit(1);
    return rows[0] ?? null;
  },
  ["careers-org"],
  { tags: [CAREERS_JOBS_TAG], revalidate: 3600 },
);

/** Published jobs that have not passed their closing date. */
export const getPublishedJobs = unstable_cache(
  async (orgId: string): Promise<CareersJob[]> => {
    const rows = await db
      .select({
        id: jobPostings.id,
        slug: jobPostings.slug,
        title: jobPostings.title,
        location: jobPostings.location,
        workMode: jobPostings.workMode,
        employmentType: jobPostings.type,
        departmentName: departments.name,
        salaryMin: jobPostings.salaryMin,
        salaryMax: jobPostings.salaryMax,
        salaryVisible: jobPostings.salaryVisible,
        publishedAt: jobPostings.publishedAt,
      })
      .from(jobPostings)
      .leftJoin(departments, eq(departments.id, jobPostings.departmentId))
      .where(
        and(
          eq(jobPostings.orgId, orgId),
          eq(jobPostings.status, "OPEN"),
          isNotNull(jobPostings.slug),
          // A closing date in the past hides the job even before the cron runs.
          or(isNull(jobPostings.closesAt), gt(jobPostings.closesAt, new Date())),
        ),
      )
      .orderBy(desc(jobPostings.publishedAt));

    return rows.map((r) => ({
      ...r,
      slug: r.slug as string,
      salaryVisible: r.salaryVisible ?? false,
    }));
  },
  ["careers-jobs"],
  { tags: [CAREERS_JOBS_TAG], revalidate: 300 },
);

/** One job by slug, whatever its state, so a closed role can say so. */
export const getCareersJobBySlug = unstable_cache(
  async (orgId: string, slug: string) => {
    const rows = await db
      .select({
        id: jobPostings.id,
        slug: jobPostings.slug,
        title: jobPostings.title,
        description: jobPostings.description,
        requirements: jobPostings.requirements,
        location: jobPostings.location,
        workMode: jobPostings.workMode,
        employmentType: jobPostings.type,
        departmentName: departments.name,
        salaryMin: jobPostings.salaryMin,
        salaryMax: jobPostings.salaryMax,
        salaryVisible: jobPostings.salaryVisible,
        currency: jobPostings.currency,
        status: jobPostings.status,
        publishedAt: jobPostings.publishedAt,
        closesAt: jobPostings.closesAt,
        seoTitle: jobPostings.seoTitle,
        seoDescription: jobPostings.seoDescription,
      })
      .from(jobPostings)
      .leftJoin(departments, eq(departments.id, jobPostings.departmentId))
      .where(and(eq(jobPostings.orgId, orgId), eq(jobPostings.slug, slug)))
      .limit(1);
    return rows[0] ?? null;
  },
  ["careers-job"],
  { tags: [CAREERS_JOBS_TAG], revalidate: 300 },
);

/** A published job is open to applications; anything else is history. */
export function jobIsOpen(job: { status: string | null; closesAt: Date | null }): boolean {
  if (job.status !== "OPEN") return false;
  return !job.closesAt || job.closesAt.getTime() > Date.now();
}
