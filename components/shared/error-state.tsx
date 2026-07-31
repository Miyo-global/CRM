"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  description = "An error occurred while loading this data. Please try again.",
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5",
        compact ? "py-8 px-4" : "py-14 px-6",
        className
      )}
      role="alert"
    >
      <div
        className={cn(
          "rounded-xl bg-destructive/10 flex items-center justify-center mb-4",
          compact ? "h-10 w-10" : "h-12 w-12"
        )}
      >
        <AlertTriangle
          className={cn(
            "text-destructive",
            compact ? "h-5 w-5" : "h-6 w-6"
          )}
        />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-[0.9375rem]"
        )}
      >
        {title}
      </h3>

      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs leading-relaxed",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {description}
      </p>

      {onRetry && (
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className={cn("mt-4", compact && "h-7 text-xs")}
          onClick={onRetry}
        >
          <RefreshCw className={cn(compact ? "h-3 w-3 mr-1.5" : "h-4 w-4 mr-2")} />
          Try again
        </Button>
      )}
    </div>
  );
}
