"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function InvitationError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Invalid Invitation"
      fallbackMessage="This invitation link may be expired or invalid."
    />
  );
}
