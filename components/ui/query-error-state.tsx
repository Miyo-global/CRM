"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

interface QueryErrorStateProps {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

function errorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message) return error.message;
  return null;
}

export function QueryErrorState({
  title = "Couldn't load this data",
  error,
  onRetry,
  className,
}: QueryErrorStateProps) {
  const message = errorMessage(error);
  return (
    <div
      role="alert"
      className={cn(
        "flex min-h-[50vh] w-full flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface-sunken/40 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-danger-soft text-danger-strong">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {message ?? "Something went wrong while loading. Please try again."}
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="mt-2">
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );
}
