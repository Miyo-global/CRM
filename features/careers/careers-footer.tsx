import Image from "next/image";
import Link from "next/link";
import { COMPANY_WEBSITE_URL } from "@/features/careers/about-company";

export function CareersFooter() {
  return (
    <footer className="mt-auto border-t border-sidebar-border bg-ink-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative size-7 shrink-0">
              <Image
                src="/logo.svg"
                alt="Miyo Global"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-sidebar-accent-foreground">Miyo Global</p>
              <p className="text-xs text-sidebar-muted">
                Building the future of capital markets
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-sidebar-foreground">
            <Link href="/careers" className="rounded-sm outline-none transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring">
              Careers
            </Link>
            <a
              href={COMPANY_WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm outline-none transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              miyoglobal.com
            </a>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs text-sidebar-muted">
          &copy; {new Date().getFullYear()} Miyo Global. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
