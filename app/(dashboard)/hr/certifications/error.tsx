"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrcertificationsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Certifications Error"
      fallbackMessage="Failed to load Certifications. Please try again."
    />
  );
}
