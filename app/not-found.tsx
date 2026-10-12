"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalNotFound() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Link href="/" className="mb-10 flex items-center gap-3">
        <Image src="/logo.svg" alt="Miyo Global Logo" width={36} height={36} className="rounded-full" />
        <span className="font-display text-xl font-bold text-foreground">Miyo Global</span>
      </Link>

      <div className="relative flex size-56 items-center justify-center">
        <div aria-hidden="true" className="absolute inset-0 rounded-full border border-gold-400/40 bg-gold-400/10" />
        <p className="relative font-display text-8xl font-extrabold tracking-tight text-brand-text">404</p>
      </div>

      <h1 className="mt-8 font-display text-3xl font-bold text-foreground">Page not found</h1>
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

      <a
        href="mailto:support@miyoglobal.com"
        className="mt-6 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-text"
      >
        Contact Support
      </a>
    </div>
  );
}
