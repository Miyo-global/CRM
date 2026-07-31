"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SocialMediaError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Social Media Error"
      fallbackMessage="Failed to load social media."
    />
  );
}
