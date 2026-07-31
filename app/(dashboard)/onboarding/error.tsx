"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function OnboardingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      fallbackMessage="Failed to load onboarding. Please try again."
      layout="centered"
    />
  );
}
