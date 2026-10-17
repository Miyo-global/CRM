import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Application sent",
  robots: { index: false, follow: true },
};

/** MIYO-0639: where the apply form lands. */
export default function ApplicationSentPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-24">
      <h1 className="text-2xl font-semibold text-foreground">Your application is in</h1>
      <p className="mt-3 text-muted-foreground">
        We have emailed you a copy. Someone will read it within a week; if it is a fit, we
        will write to arrange a conversation.
      </p>
      <p className="mt-6">
        <Link href="/careers" className="underline underline-offset-4">
          See the other open roles
        </Link>
      </p>
    </main>
  );
}
