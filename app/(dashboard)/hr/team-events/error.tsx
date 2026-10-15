"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrteameventsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load team events"
      fallbackMessage="Something went wrong loading team events. Try again."
    />
  );
}
