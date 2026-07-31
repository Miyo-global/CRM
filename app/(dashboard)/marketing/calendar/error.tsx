"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function MarketingCalendarError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Marketing Calendar Error" fallbackMessage="Failed to load marketing calendar. Please try again." />;
}
