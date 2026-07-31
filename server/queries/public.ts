import "server-only";

import { db } from "@/lib/db";
import { jobPostings, departments } from "@/lib/db/schema";
import { landingPages } from "@/lib/db/schema/marketing";
import { eq, desc, inArray, and, or, isNull, gte } from "drizzle-orm";

function todayInIst(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export interface PublicJobPosting {
  id: number;
  title: string;
  location: string | null;
  type: string | null;
  experience: string | null;
  openings: number | null;
  applicationDeadline: string | null;
  createdAt: Date | null;
  salaryMin: string | null;
  salaryMax: string | null;
  departmentId: number | null;
}

export async function listOpenJobPostings(): Promise<PublicJobPosting[]> {
  return db
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      location: jobPostings.location,
      type: jobPostings.type,
      experience: jobPostings.experience,
      openings: jobPostings.openings,
      applicationDeadline: jobPostings.applicationDeadline,
      createdAt: jobPostings.createdAt,
      salaryMin: jobPostings.salaryMin,
      salaryMax: jobPostings.salaryMax,
      departmentId: jobPostings.departmentId,
    })
    .from(jobPostings)
    .where(
      and(
        eq(jobPostings.status, "OPEN"),
        or(
          isNull(jobPostings.applicationDeadline),
          gte(jobPostings.applicationDeadline, todayInIst())
        )
      )
    )
    .orderBy(desc(jobPostings.createdAt));
}

export async function listDepartmentsByIds(ids: number[]): Promise<Map<number, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(inArray(departments.id, ids));
  return new Map(rows.map((d) => [d.id, d.name]));
}

export async function getJobPostingMetadata(id: number) {
  const rows = await db
    .select({ title: jobPostings.title, location: jobPostings.location })
    .from(jobPostings)
    .where(
      and(
        eq(jobPostings.id, id),
        eq(jobPostings.status, "OPEN"),
        or(
          isNull(jobPostings.applicationDeadline),
          gte(jobPostings.applicationDeadline, todayInIst())
        )
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getJobPostingDetail(id: number) {
  const rows = await db
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      location: jobPostings.location,
      type: jobPostings.type,
      experience: jobPostings.experience,
      description: jobPostings.description,
      requirements: jobPostings.requirements,
      benefits: jobPostings.benefits,
      openings: jobPostings.openings,
      applicationDeadline: jobPostings.applicationDeadline,
      createdAt: jobPostings.createdAt,
      salaryMin: jobPostings.salaryMin,
      salaryMax: jobPostings.salaryMax,
      departmentId: jobPostings.departmentId,
      applicationFields: jobPostings.applicationFields,
    })
    .from(jobPostings)
    .where(
      and(
        eq(jobPostings.id, id),
        eq(jobPostings.status, "OPEN"),
        or(
          isNull(jobPostings.applicationDeadline),
          gte(jobPostings.applicationDeadline, todayInIst())
        )
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getDepartmentName(id: number): Promise<string | null> {
  const rows = await db
    .select({ name: departments.name })
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);
  return rows[0]?.name ?? null;
}

export async function getLandingPageMetadataBySlug(slug: string) {
  const rows = await db
    .select({ title: landingPages.title, description: landingPages.description })
    .from(landingPages)
    .where(and(eq(landingPages.slug, slug), eq(landingPages.isPublished, true)));
  return rows[0] ?? null;
}

export async function getLandingPageBySlug(slug: string) {
  const rows = await db
    .select({
      id: landingPages.id,
      orgId: landingPages.orgId,
      title: landingPages.title,
      content: landingPages.content,
      description: landingPages.description,
      settings: landingPages.settings,
    })
    .from(landingPages)
    .where(and(eq(landingPages.slug, slug), eq(landingPages.isPublished, true)));
  return rows[0] ?? null;
}
