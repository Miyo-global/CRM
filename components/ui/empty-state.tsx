"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

interface ActionProps {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: ActionProps;
  secondaryAction?: ActionProps;
  className?: string;
  compact?: boolean;
}

function ActionButton({
  action,
  size,
  className,
  variant = "default",
}: {
  action: ActionProps;
  size: "sm" | "default";
  className?: string;
  variant?: "default" | "outline";
}) {
  if (action.href) {
    return (
      <Button asChild size={size} variant={variant} className={className}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }
  return (
    <Button
      size={size}
      variant={variant}
      onClick={action.onClick}
      className={className}
    >
      {action.label}
    </Button>
  );
}

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-14 px-6",
        "rounded-xl border border-dashed border-border/60 bg-muted/20",
        className
      )}
    >
      {illustration ? (
        <div className={cn("mb-4", compact ? "mb-3" : "mb-5")}>{illustration}</div>
      ) : Icon ? (
        <div
          className={cn(
            "mb-4 rounded-xl bg-muted flex items-center justify-center",
            compact ? "h-10 w-10 mb-3" : "h-12 w-12 mb-5"
          )}
        >
          <Icon
            className={cn(
              "text-muted-foreground/60",
              compact ? "h-5 w-5" : "h-6 w-6"
            )}
          />
        </div>
      ) : null}

      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-[0.9375rem]"
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-muted-foreground mt-1 max-w-xs leading-relaxed",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={cn("flex items-center gap-2", compact ? "mt-3" : "mt-5")}>
          {action && (
            <ActionButton
              action={action}
              size={compact ? "sm" : "default"}
              className={compact ? "h-7 text-xs" : undefined}
            />
          )}
          {secondaryAction && (
            <ActionButton
              action={secondaryAction}
              size={compact ? "sm" : "default"}
              variant="outline"
              className={compact ? "h-7 text-xs" : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
