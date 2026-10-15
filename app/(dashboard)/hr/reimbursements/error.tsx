"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrreimbursementsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load reimbursements"
      fallbackMessage="Something went wrong loading reimbursements. Try again."
    />
  );
}
