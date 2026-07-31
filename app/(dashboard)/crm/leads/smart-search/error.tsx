"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function SmartLeadSearchError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Smart Lead Search Error" fallbackMessage="Failed to load the smart search. Please try again." />;
}
