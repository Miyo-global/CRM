import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type CareersHeaderProps = {
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function CareersHeader({
  backHref = "/",
  backLabel = "Back to site",
  className,
}: CareersHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-topbar border-b border-sidebar-border bg-ink-950/95 backdrop-blur-md",
        className
      )}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link
          href="/careers"
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <div className="relative size-8 shrink-0">
            <Image
              src="/logo.svg"
              alt="Miyo Global"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="block font-display text-base font-bold tracking-tight text-sidebar-accent-foreground">
              Miyo Global
            </span>
            <span className="text-2xs font-medium uppercase tracking-wide text-sidebar-muted">
              Advisors LLP
            </span>
          </div>
        </Link>

        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md text-sm font-medium text-sidebar-foreground outline-none transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden="true"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          {backLabel}
        </Link>
      </div>
    </header>
  );
}
