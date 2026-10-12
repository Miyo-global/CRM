import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { QueryErrorState } from "@/components/ui/query-error-state";

/** WidgetCard-styled "View all →" link that keeps a descriptive aria-label (pass via WidgetCard `actions`). */
export function ViewAllLink({
  href,
  label = "View all",
  ariaLabel,
}: {
  href: string;
  label?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-brand-text outline-none hover:underline focus-visible:focus-ring"
    >
      {label}
      <ArrowRight className="size-3" aria-hidden="true" />
    </Link>
  );
}

/** In-widget error with retry: QueryErrorState sized for a card body. */
export function WidgetError({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  return <QueryErrorState error={error} onRetry={onRetry} className="min-h-0 gap-2 py-6" />;
}
