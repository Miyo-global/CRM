import { cn } from "@/lib/utils";

import { COMPANY_WEBSITE_URL } from "@/lib/constants/company";

export { COMPANY_WEBSITE_URL };

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function AboutCompany({ className }: { className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-5 shadow-xs", className)}>
      <h2 className="mb-3 font-display text-lg font-bold">About the Company</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p>
          Miyo Global is an investment platform delivering
          institutional-grade analytics and real-time market insights — our
          &ldquo;Wealth Intelligence&rdquo; — to help investors make informed
          decisions. We pair deep financial expertise with modern technology to
          build the future of capital markets, backed by KYC-verified onboarding
          and ISO&nbsp;27001-certified security.
        </p>
        <p>
          For more about who we are, what we do, and our vision, visit our
          website.
        </p>
      </div>
      <a
        href={COMPANY_WEBSITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-soft px-3 text-sm font-semibold text-brand-soft-foreground outline-none transition-colors hover:bg-primary/15 focus-visible:focus-ring"
      >
        Visit miyoglobal.com
        <ExternalLinkIcon className="size-3.5" />
      </a>
    </section>
  );
}
