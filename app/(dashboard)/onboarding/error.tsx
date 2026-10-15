"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function OnboardingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      fallbackMessage="Something went wrong loading onboarding. Try again."
      layout="centered"
    />
  );
}
