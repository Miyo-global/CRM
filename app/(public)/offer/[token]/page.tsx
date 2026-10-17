import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { money, offerByToken } from "@/lib/ats/offers";
import { OfferResponseForm } from "@/features/ats/offers/offer-response-form";

export const metadata: Metadata = {
  title: "Your offer",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** MIYO-0662: the candidate's view of their offer. */
export default async function OfferPage({ params }: { params: Promise<{ token: string }> }) {
  if (!ATS_MODULE_ENABLED) notFound();

  const { token } = await params;
  const found = await offerByToken(token);
  if (!found) notFound();

  const { offer, expired } = found;

  if (expired) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-24">
        <h1 className="text-2xl font-semibold text-foreground">This offer has expired</h1>
        <p className="mt-3 text-muted-foreground">
          The link stopped working on {offer.validUntil}. If you would still like to join,
          write to the person who sent it and they can send a fresh one.
        </p>
      </main>
    );
  }

  const answered = Boolean(offer.respondedAt);

  const facts: [string, string][] = [
    ["Role", found.jobTitle ?? offer.offeredDesignation ?? "not stated"],
    ["Designation", offer.offeredDesignation ?? "not stated"],
    ["Location", found.jobLocation ?? "not stated"],
    ["Monthly salary", money(offer.offeredSalary)],
    ["Joining date", offer.joiningDate ?? "to be agreed"],
    ["Please answer by", offer.validUntil ?? "soon"],
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">
        {found.candidateFirstName}, here is your offer
      </h1>

      <dl className="mt-8 grid gap-3 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="grid gap-1 sm:grid-cols-[200px_1fr]">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {offer.offerLetterUrl && (
        <p className="mt-6 text-sm">
          <a
            href={offer.offerLetterUrl}
            className="underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the full letter (PDF)
          </a>
        </p>
      )}

      {answered ? (
        <p className="mt-10 text-sm text-muted-foreground">
          You answered this offer already. Write to HR if something has changed.
        </p>
      ) : (
        <OfferResponseForm token={token} />
      )}
    </main>
  );
}
