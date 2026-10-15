"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrcertificationsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load certifications"
      fallbackMessage="Something went wrong loading certifications. Try again."
    />
  );
}
