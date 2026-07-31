"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SentimentAnalysisError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Sentiment Analysis Error"
      fallbackMessage="Failed to load the sentiment analysis tool. Please try again."
    />
  );
}
