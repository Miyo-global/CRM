import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const postSchema = z.object({
  jobPostingId: z.number().int().positive(),
  platforms: z.array(z.enum(["LINKEDIN", "NAUKRI", "INDEED"])).min(1),
});

const PLATFORM_CONFIGS: Record<string, { name: string; envKey: string; apiUrl: string }> = {
  LINKEDIN: { name: "LinkedIn", envKey: "LINKEDIN_API_KEY", apiUrl: "https://api.linkedin.com/v2/simpleJobPostings" },
  NAUKRI: { name: "Naukri", envKey: "NAUKRI_API_KEY", apiUrl: "https://api.naukri.com/v1/jobpostings" },
  INDEED: { name: "Indeed", envKey: "INDEED_API_KEY", apiUrl: "https://apis.indeed.com/v1/jobs" },
};

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can post to job boards.", 403);

    const body = postSchema.parse(await req.json());

    const job = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, body.jobPostingId), eq(jobPostings.orgId, session.orgId)),
    });
    if (!job) return err("Job posting not found.", 404);
    if (job.status !== "OPEN") return err("Job must be OPEN to post to boards.", 400);

    const results: { platform: string; status: "SUCCESS" | "SKIPPED" | "ERROR"; message: string }[] = [];

    for (const platform of body.platforms) {
      const config = PLATFORM_CONFIGS[platform];
      const apiKey = process.env[config.envKey];

      if (!apiKey) {
        results.push({ platform, status: "SKIPPED", message: `${config.name} API key not configured (${config.envKey})` });
        continue;
      }

      try {
        const response = await fetch(config.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            title: job.title,
            description: job.description,
            requirements: job.requirements,
            location: job.location,
            type: job.type,
            experience: job.experience,
            salary_min: job.salaryMin,
            salary_max: job.salaryMax,
          }),
        });

        if (response.ok) {
          results.push({ platform, status: "SUCCESS", message: `Posted to ${config.name}` });
        } else {
          results.push({ platform, status: "ERROR", message: `${config.name} returned ${response.status}` });
        }
      } catch {
        results.push({ platform, status: "ERROR", message: `Failed to connect to ${config.name}` });
      }
    }

    return ok({ results });
  });
}
