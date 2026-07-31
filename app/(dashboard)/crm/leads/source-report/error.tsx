"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function LeadSourceReportError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Lead Source Report Error" fallbackMessage="Failed to load lead source report. Please try again." />;
}
