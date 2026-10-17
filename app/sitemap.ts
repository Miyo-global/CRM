import type { MetadataRoute } from "next";

import { appUrl } from "@/lib/app-url";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { getCareersOrg, getPublishedJobs } from "@/lib/ats/careers";

export const revalidate = 3600;

/** MIYO-0638: the public pages worth indexing — the careers list and each open role. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: appUrl, changeFrequency: "monthly", priority: 0.5 },
  ];

  if (!ATS_MODULE_ENABLED) return entries;

  const org = await getCareersOrg();
  if (!org) return entries;

  const jobs = await getPublishedJobs(org.id);
  entries.push({
    url: `${appUrl}/careers`,
    changeFrequency: "daily",
    priority: 0.8,
  });
  for (const job of jobs) {
    entries.push({
      url: `${appUrl}/careers/${job.slug}`,
      lastModified: job.publishedAt ?? undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
