import {
  getLandingPageMetadataBySlug,
  getLandingPageBySlug,
} from "@/server/queries/public";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LandingForm } from "@/features/landing/landing-form";
import { clientEnv } from "@/lib/env";
import { sanitizeHtml } from "@/lib/sanitize";

export const revalidate = 60;

type Props = { params: Promise<{ landingSlug: string }>; searchParams: Promise<Record<string, string>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { landingSlug: slug } = await params;
  const page = await getLandingPageMetadataBySlug(slug);
  if (!page) return { title: "Not Found" };

  const title = page.title ?? "Landing Page";
  const description = page.description ?? undefined;
  const baseUrl = clientEnv.NEXT_PUBLIC_APP_URL ?? "https://miyoglobal.com";
  const pageUrl = `${baseUrl}/${slug}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: pageUrl,
      siteName: "Miyo Global",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function LandingPageRoute({ params, searchParams }: Props) {
  const { landingSlug: slug } = await params;

  const page = await getLandingPageBySlug(slug);
  if (!page) notFound();

  const sp = await searchParams;
  const utm = {
    utmSource: sp.utm_source ?? null,
    utmMedium: sp.utm_medium ?? null,
    utmCampaign: sp.utm_campaign ?? null,
    utmContent: sp.utm_content ?? null,
    utmTerm: sp.utm_term ?? null,
    referrerUrl: sp.ref ?? null,
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="bg-blue text-white py-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {page.title ?? slug}
          </h1>
          {page.description && (
            <p className="text-lg text-white/80">{page.description}</p>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 grid gap-10 lg:grid-cols-2">
        {page.content && (
          <article
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.content) }}
          />
        )}

        <div className={page.content ? "" : "lg:col-span-2 max-w-xl mx-auto w-full"}>
          <LandingForm orgId={page.orgId} utm={utm} />
        </div>
      </div>

      {page.settings?.showTrustSection && page.settings?.testimonials && page.settings.testimonials.length > 0 && (
        <section className="bg-muted/40 py-14 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">What Our Clients Say</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {page.settings.testimonials.map((t) => (
                <div key={t.id} className="rounded-xl border bg-background p-5 shadow-sm space-y-3">
                  {t.rating && t.rating > 0 && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < t.rating! ? "text-amber-400" : "text-muted-foreground/30"}>★</span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
