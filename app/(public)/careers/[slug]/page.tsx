import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { appUrl } from "@/lib/app-url";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { getCareersJobBySlug, getCareersOrg, jobIsOpen } from "@/lib/ats/careers";
import { formatIST } from "@/lib/date-utils";

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

/** Schema.org wants its own spelling of the employment type. */
const SCHEMA_EMPLOYMENT: Record<string, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACTOR",
  INTERN: "INTERN",
};

async function loadJob(slug: string) {
  const org = await getCareersOrg();
  if (!org) return null;
  const job = await getCareersJobBySlug(org.id, slug);
  return job ? { org, job } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadJob(slug);
  if (!found) return { title: "Role not found" };

  const { org, job } = found;
  const title = job.seoTitle || `${job.title} · ${org.name}`;
  const description =
    job.seoDescription ||
    [job.title, job.departmentName, job.location].filter(Boolean).join(" · ");
  const url = `${appUrl}/careers/${job.slug}`;
  const open = jobIsOpen(job);

  return {
    title,
    description,
    alternates: { canonical: url },
    // MIYO-0638: a closed role stays reachable for anyone holding the link,
    // but it should not keep turning up in search.
    robots: open ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, type: "article", siteName: org.name },
  };
}

/** MIYO-0638: one role, with the JobPosting markup search engines read. */
export default async function CareersJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ utm_source?: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const { slug } = await params;
  const found = await loadJob(slug);
  if (!found) notFound();
  const { org, job } = found;
  const open = jobIsOpen(job);
  const { utm_source: utmSource } = await searchParams;
  const applyHref = `/careers/${job.slug}/apply${utmSource ? `?utm_source=${encodeURIComponent(utmSource)}` : ""}`;

  const facts = [
    job.departmentName,
    job.location,
    job.workMode ? WORK_MODE_LABELS[job.workMode] : null,
    job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null,
    job.salaryVisible && job.salaryMin
      ? `₹${Number(job.salaryMin).toLocaleString("en-IN")}${
          job.salaryMax ? ` – ₹${Number(job.salaryMax).toLocaleString("en-IN")}` : ""
        } per month`
      : null,
  ].filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description ?? "",
    datePosted: job.publishedAt?.toISOString(),
    validThrough: job.closesAt?.toISOString(),
    employmentType: job.employmentType ? SCHEMA_EMPLOYMENT[job.employmentType] : undefined,
    hiringOrganization: {
      "@type": "Organization",
      name: org.name,
      sameAs: appUrl,
      logo: org.logo ?? undefined,
    },
    jobLocationType: job.workMode === "REMOTE" ? "TELECOMMUTE" : undefined,
    jobLocation: job.location
      ? {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "IN" },
        }
      : undefined,
    baseSalary:
      job.salaryVisible && job.salaryMin
        ? {
            "@type": "MonetaryAmount",
            currency: job.currency ?? "INR",
            value: {
              "@type": "QuantitativeValue",
              minValue: Number(job.salaryMin),
              maxValue: job.salaryMax ? Number(job.salaryMax) : undefined,
              unitText: "MONTH",
            },
          }
        : undefined,
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/careers" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        All roles
      </Link>

      <h1 className="mt-6 text-3xl font-semibold text-foreground">{job.title}</h1>
      <p className="mt-2 text-muted-foreground">{facts.join(" · ")}</p>

      {!open ? (
        <div className="mt-8 border-l-2 border-border pl-4">
          <p className="font-medium text-foreground">This role is closed.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            It stopped taking applications
            {job.closesAt ? ` on ${formatIST(job.closesAt, { day: "numeric", month: "long", year: "numeric" })} IST` : ""}
            .{" "}
            <Link href="/careers" className="underline underline-offset-4">
              See what is open
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <Link
            href={applyHref}
            className="inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Apply for this role
          </Link>
        </div>
      )}

      <article
        className="prose prose-sm mt-10 max-w-none text-foreground"
        dangerouslySetInnerHTML={{ __html: job.description ?? "" }}
      />

      {job.requirements && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-foreground">What we are looking for</h2>
          <article
            className="prose prose-sm mt-3 max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: job.requirements }}
          />
        </section>
      )}
    </main>
  );
}
