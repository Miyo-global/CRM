"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative flex size-48 items-center justify-center">
        <div aria-hidden="true" className="absolute inset-0 rounded-full border border-gold-400/40 bg-gold-400/10" />
        <p className="relative font-display text-7xl font-extrabold tracking-tight text-brand-text">404</p>
      </div>

      <h2 className="mt-8 font-display text-3xl font-bold text-foreground">Page not found</h2>
      <p className="mt-3 max-w-md text-base text-muted-foreground">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/dashboard">
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Go to dashboard
          </Link>
        </Button>
        <Button variant="ghost" size="lg" onClick={() => router.back()}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Go back
        </Button>
      </div>
    </div>
  );
}
