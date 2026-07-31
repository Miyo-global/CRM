"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noInternalScroll?: boolean;
  /** When true, title row (+ filters if any) stays visible inside the dashboard main scroll area. */
  stickyHeader?: boolean;
}

export function PageWrapper({
  title,
  subtitle,
  badge,
  actions,
  filters,
  children,
  className,
  contentClassName,
  noInternalScroll = false,
  stickyHeader = false,
}: PageWrapperProps) {
  const titleBlock = (
    <div className="px-4 sm:px-6 pt-4 pb-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {badge && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium tabular-nums border border-border/60">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-[13px] text-muted-foreground leading-snug">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );

  const filtersBlock = filters ? (
    <div
      className={cn(
        "shrink-0 bg-background",
        stickyHeader ? "border-t border-border/60" : "border-b border-border/60",
      )}
    >
      <div className="px-3 sm:px-4 py-2 flex items-center gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain scrollbar-thin">
        {filters}
      </div>
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col w-full",
        noInternalScroll && "flex-1 min-h-0",
        className,
      )}
    >
      {stickyHeader ? (
        <div
          className={cn(
            "sticky top-0 z-10 shrink-0 border-b border-border",
            "bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80",
          )}
        >
          {titleBlock}
          {filtersBlock}
        </div>
      ) : (
        <>
          <div className="shrink-0">{titleBlock}</div>
          {filtersBlock}
          {!filters && <div className="shrink-0 mx-4 sm:mx-6 h-px bg-border/60" />}
        </>
      )}

      {noInternalScroll ? (
        <div className={cn("flex-1 min-h-0 overflow-hidden px-4 sm:px-6 pt-3 pb-4", contentClassName)}>
          {children}
        </div>
      ) : (
        <div className={cn("px-4 sm:px-6 pt-3 pb-6", contentClassName)}>{children}</div>
      )}
    </div>
  );
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
