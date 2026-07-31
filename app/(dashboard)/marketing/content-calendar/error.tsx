"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ContentCalendarError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Content Calendar Error"
      fallbackMessage="Failed to load Content Calendar. Please try again."
    />
  );
}
