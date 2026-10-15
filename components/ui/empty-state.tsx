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
  variant?: "default" | "ghost";
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
        "flex w-full flex-1 flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "min-h-[min(50vh,28rem)] py-14 px-6",
        "rounded-lg border border-dashed border-border bg-surface-sunken/40",
        className
      )}
    >
      {/* Text-first: illustrations are gone and the icon is a plain glyph, not
          a coloured chip (B4). */}
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn("text-muted-foreground", compact ? "mb-2 size-5" : "mb-3 size-6")}
        />
      ) : null}

      <h3
        className={cn(
          "text-foreground",
          compact ? "text-sm font-semibold" : "font-display text-lg font-bold"
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "mt-1 max-w-sm text-muted-foreground",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={cn("flex flex-wrap items-center justify-center gap-2", compact ? "mt-3" : "mt-5")}>
          {action && <ActionButton action={action} size={compact ? "sm" : "default"} />}
          {secondaryAction && (
            <ActionButton
              action={secondaryAction}
              size={compact ? "sm" : "default"}
              variant="ghost"
            />
          )}
        </div>
      )}
    </div>
  );
}
