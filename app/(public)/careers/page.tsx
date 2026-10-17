import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { getCareersOrg, getPublishedJobs, type CareersJob } from "@/lib/ats/careers";
import { pluralise } from "@/lib/format-utils";

export const metadata: Metadata = {
  title: "Careers",
  description: "Open roles at Miyo Global.",
};

const WORK_MODE_LABELS: Record<string, string> = {
  ONSITE: "On site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

function jobLine(job: CareersJob): string {
  return [
    job.departmentName,
    job.location,
    job.workMode ? WORK_MODE_LABELS[job.workMode] : null,
    job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * MIYO-0637: the public job list. No sign-in, no illustrations — the roles,
 * a filter by department and location, and a link into each one.
 */
export default async function CareersPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; location?: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const org = await getCareersOrg();
  if (!org) notFound();

  const jobs = await getPublishedJobs(org.id);
  const { department, location } = await searchParams;

  const departments = [...new Set(jobs.map((j) => j.departmentName).filter(Boolean))].sort() as string[];
  const locations = [...new Set(jobs.map((j) => j.location).filter(Boolean))].sort() as string[];

  const shown = jobs.filter(
    (j) =>
      (!department || j.departmentName === department) &&
      (!location || j.location === location),
  );

  const filterLink = (next: { department?: string; location?: string }) => {
    const params = new URLSearchParams();
    const d = next.department ?? department;
    const l = next.location ?? location;
    if (d) params.set("department", d);
    if (l) params.set("location", l);
    const query = params.toString();
    return query ? `/careers?${query}` : "/careers";
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="border-b border-border pb-8">
        {org.logo && (
          <Image
            src={org.logo}
            alt={org.name}
            width={120}
            height={40}
            className="mb-6 h-10 w-auto"
            unoptimized
          />
        )}
        <h1 className="text-3xl font-semibold text-foreground">Careers at {org.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {jobs.length === 0
            ? "No open roles right now."
            : `${pluralise(jobs.length, "open role")}.`}
        </p>
      </header>

      {(departments.length > 1 || locations.length > 1) && (
        <nav className="flex flex-wrap gap-x-6 gap-y-3 border-b border-border py-5 text-sm">
          {departments.length > 1 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground">Team</span>
              <Link
                href={filterLink({ department: "" })}
                className={!department ? "font-medium text-foreground" : "text-muted-foreground"}
              >
                All
              </Link>
              {departments.map((d) => (
                <Link
                  key={d}
                  href={filterLink({ department: d })}
                  className={
                    department === d ? "font-medium text-foreground" : "text-muted-foreground"
                  }
                >
                  {d}
                </Link>
              ))}
            </div>
          )}
          {locations.length > 1 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground">Location</span>
              <Link
                href={filterLink({ location: "" })}
                className={!location ? "font-medium text-foreground" : "text-muted-foreground"}
              >
                All
              </Link>
              {locations.map((l) => (
                <Link
                  key={l}
                  href={filterLink({ location: l })}
                  className={
                    location === l ? "font-medium text-foreground" : "text-muted-foreground"
                  }
                >
                  {l}
                </Link>
              ))}
            </div>
          )}
        </nav>
      )}

      <ul className="divide-y divide-border">
        {shown.map((job) => (
          <li key={job.id} className="py-5">
            <Link
              href={`/careers/${job.slug}`}
              className="text-lg font-medium text-foreground underline-offset-4 hover:underline"
            >
              {job.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">{jobLine(job)}</p>
          </li>
        ))}
      </ul>

      {jobs.length > 0 && shown.length === 0 && (
        <p className="py-10 text-muted-foreground">Nothing open with those filters.</p>
      )}
    </main>
  );
}
