"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MyOnboardingTasksError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load onboarding"
      fallbackMessage="Failed to load your onboarding tasks."
    />
  );
}
