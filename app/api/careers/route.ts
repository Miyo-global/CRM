import { ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, desc, and, or, isNull, gte } from "drizzle-orm";
import { getTodayIST } from "@/lib/careers/application-deadline";

export async function GET() {
  const todayIST = getTodayIST();

  const data = await db
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
    })
    .from(jobPostings)
    .where(
      and(
        eq(jobPostings.status, "OPEN"),
        or(
          isNull(jobPostings.applicationDeadline),
          gte(jobPostings.applicationDeadline, todayIST),
        ),
      ),
    )
    .orderBy(desc(jobPostings.createdAt))
    .limit(200);

  return ok(data);
}
