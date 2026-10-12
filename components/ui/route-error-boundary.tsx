"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Copy, RefreshCw } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    logger.error("Route error boundary caught error", { error: error.message, digest: error.digest });
    Sentry.captureException(error);
  }, [error]);
  const displayMessage = error.digest
    ? fallbackMessage
    : (typeof error.message === "string" && error.message.length > 0 ? error.message : fallbackMessage);

  const copyId = () => {
    if (!error.digest) return;
    void navigator.clipboard?.writeText(error.digest).then(() => setCopied(true), () => {});
  };

  const content = (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger-strong">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{displayMessage}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </Button>
        {error.digest && (
          <Button variant="ghost" onClick={copyId}>
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy error ID"}
          </Button>
        )}
      </div>
    </div>
  );

  if (layout === "fullscreen") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
        <div className="max-w-md">{content}</div>
      </div>
    );
  }

  if (layout === "centered") {
    return <div className="mx-auto max-w-4xl py-10">{content}</div>;
  }

  return <div className="px-4 py-12">{content}</div>;
}
