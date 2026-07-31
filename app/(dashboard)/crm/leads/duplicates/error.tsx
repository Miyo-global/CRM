"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function DuplicateLeadsError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Duplicate Lead Detection Error" fallbackMessage="Failed to load duplicate lead scan. Please try again." />;
}
