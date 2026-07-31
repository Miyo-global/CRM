"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ClientOnboardingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Client Onboarding Error"
      fallbackMessage="Failed to load client onboarding checklists. Please try again."
    />
  );
}
