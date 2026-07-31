"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logger } from "@/lib/logger";

interface RouteErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  fallbackMessage?: string;
layout?: "centered" | "inline" | "fullscreen";
}

export function RouteErrorBoundary({
  error,
  reset,
  title = "Something went wrong",
  fallbackMessage = "An unexpected error occurred. Please try again.",
  layout = "inline",
}: RouteErrorBoundaryProps) {
  useEffect(() => {
    logger.error("Route error boundary caught error", { error: error.message, digest: error.digest });
    Sentry.captureException(error);
  }, [error]);
  const displayMessage = error.digest
    ? fallbackMessage
    : (typeof error.message === "string" && error.message.length > 0 ? error.message : fallbackMessage);

  const content = (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 text-center">
      <div className="bg-destructive/10 p-4 rounded-full">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md">{displayMessage}</p>
      <Button onClick={reset} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Try Again
      </Button>
    </div>
  );

  if (layout === "fullscreen") {
    return (
      <div className="min-h-screen w-full noir-mesh flex items-center justify-center p-4">
        <div className="max-w-md">{content}</div>
      </div>
    );
  }

  if (layout === "centered") {
    return <div className="max-w-4xl mx-auto py-10">{content}</div>;
  }

  return <div className="space-y-8 py-12">{content}</div>;
}
