"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrteameventsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Team Events Error"
      fallbackMessage="Failed to load Team Events. Please try again."
    />
  );
}
