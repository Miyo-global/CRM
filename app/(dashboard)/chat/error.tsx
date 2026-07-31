"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ChatError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Chat Error"
      fallbackMessage="Failed to load chat. Please try again."
    />
  );
}
