import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { interviewBookingLinks, jobPostings } from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { formatIST } from "@/lib/date-utils";
import { SlotPicker } from "@/features/ats/interviews/slot-picker";

export const metadata: Metadata = {
  title: "Pick a time",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** MIYO-0660: the candidate's view of the times on offer. */
export default async function BookInterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!ATS_MODULE_ENABLED) notFound();

  const { token } = await params;
  const link = await db.query.interviewBookingLinks.findFirst({
    where: eq(interviewBookingLinks.token, token),
  });
  if (!link) notFound();

  const job = link.jobPostingId
    ? await db.query.jobPostings.findFirst({ where: eq(jobPostings.id, link.jobPostingId) })
    : null;

  // eslint-disable-next-line react-hooks/purity -- async Server Component, rendered per request
  const now = Date.now();
  const expired = link.expiresAt.getTime() < now;
  const booked = link.status === "booked";

  if (booked || expired) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-24">
        <h1 className="text-2xl font-semibold text-foreground">
          {booked ? "Your interview is booked" : "This link has expired"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {booked
            ? `You picked ${
                link.selectedSlot
                  ? `${formatIST(link.selectedSlot, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} IST`
                  : "a time"
              }. The invite is in your inbox.`
            : "Write to the person who sent it and they can offer new times."}
        </p>
      </main>
    );
  }

  const slots = link.availableSlots
    .filter((slot) => new Date(slot.start).getTime() > now)
    .map((slot) => ({
      start: new Date(slot.start).toISOString(),
      label: `${formatIST(new Date(slot.start), {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })} IST · ${link.durationMinutes} minutes`,
    }));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-foreground">
        Pick a time for your {job?.title ?? ""} interview
      </h1>
      <p className="mt-2 text-muted-foreground">
        All times are IST. Choose whichever suits you.
      </p>

      {slots.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          Every time on offer has passed. Write back and we will send new ones.
        </p>
      ) : (
        <SlotPicker token={token} slots={slots} />
      )}
    </main>
  );
}
