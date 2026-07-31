"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MeetingPrepError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Meeting Prep Error"
      fallbackMessage="Failed to load the Meeting Prep Brief generator. Please try again."
    />
  );
}
