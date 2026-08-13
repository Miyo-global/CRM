import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { jobPostingPath } from "@/lib/careers/job-slug";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { CRM_BASE_URL } from "@/lib/constants/company";

type RouteParams = { params: Promise<{ jobId: string }> };

const PLATFORMS = [
  { key: "LINKEDIN", name: "LinkedIn", baseUrl: "https://www.linkedin.com/sharing/share-offsite/?url=" },
  { key: "WHATSAPP", name: "WhatsApp", baseUrl: "https://wa.me/?text=" },
  { key: "TWITTER", name: "Twitter / X", baseUrl: "https://twitter.com/intent/tweet?url=" },
] as const;

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { jobId: id } = await params;
    const jobId = Number(id);
    if (!Number.isFinite(jobId)) return err("Invalid job ID", 400);

    const job = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
      columns: { id: true, title: true, location: true, type: true },
    });
    if (!job) return err("Job posting not found", 404);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? CRM_BASE_URL;

    const baseJobUrl = `${appUrl}${jobPostingPath(jobId, job.title)}`;

    const shareLinks = PLATFORMS.map(({ key, name, baseUrl }) => {
      const utmUrl = `${baseJobUrl}?utm_source=${key.toLowerCase()}&utm_medium=social&utm_campaign=job_${jobId}`;
      const encoded = encodeURIComponent(key === "WHATSAPP"
        ? `${job.title} — Apply now: ${utmUrl}`
        : utmUrl
      );
      return { platform: key, name, url: `${baseUrl}${encoded}`, utmUrl };
    });

    return ok({
      jobId,
      title: job.title,
      shareLinks,
      directLink: baseJobUrl,
    });
  });
}
