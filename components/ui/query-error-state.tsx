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
        "flex min-h-[50vh] w-full flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <h3 className="text-[0.9375rem] font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        {message ?? "Something went wrong while loading. Please try again."}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );
}
