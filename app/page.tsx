import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/features/landing/landing-page";

export const metadata: Metadata = {
  title: "Miyo Global — HR and project management",
  description:
    "Payroll, attendance, leave and onboarding alongside project tracking, in one internal workspace.",
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return <LandingPage />;
}
