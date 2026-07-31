"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function WebFormsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Web Forms Error"
      fallbackMessage="Failed to load Web-to-Lead Forms. Please try again."
    />
  );
}
