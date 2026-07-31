"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function WinLossError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Win/Loss Analysis Error" fallbackMessage="Failed to load win/loss analysis. Please try again." />;
}
