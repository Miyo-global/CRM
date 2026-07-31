"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrreimbursementsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Reimbursements Error"
      fallbackMessage="Failed to load Reimbursements. Please try again."
    />
  );
}
