"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs, useAutoBreadcrumbs, type Crumb } from "./breadcrumbs";

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
  /**
   * When true, title row (+ filters if any) stays visible inside the dashboard main scroll area.
   * Sticks at `var(--page-sticky-top, 0px)` so a shell topbar can offset it.
   */
  stickyHeader?: boolean;
  /** Small uppercase label above the title. */
  eyebrow?: React.ReactNode;
  /** Explicit crumbs; defaults to crumbs derived from the pathname + nav labels. `false` hides them. */
  breadcrumbs?: Crumb[] | false;
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
  eyebrow,
  breadcrumbs,
}: PageWrapperProps) {
  const autoCrumbs = useAutoBreadcrumbs();
  const crumbs = breadcrumbs === false ? [] : (breadcrumbs ?? (autoCrumbs.length > 1 ? autoCrumbs : []));

  const titleBlock = (
    <div className="px-4 sm:px-6 xl:px-8 pt-6 pb-4">
      {/* Auto crumbs duplicate the topbar's on lg+; explicit crumbs always render. */}
      {crumbs.length > 0 && (
        <Breadcrumbs items={crumbs} className={cn("mb-2", breadcrumbs === undefined && "lg:hidden")} />
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.08em] text-brand-text">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
            {badge && (
              <span className="inline-flex h-5 items-center rounded-full bg-neutral-soft px-2 text-2xs font-semibold tabular-nums text-neutral-strong">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {actions && (
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end [&>div]:flex-wrap [&>div]:max-w-full">
            {actions}
          </div>
        )}
      </div>
    </div>
  );

  const filtersBlock = filters ? (
    <div className="shrink-0 border-y border-border bg-background">
      <div className="flex items-center gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain px-4 py-2 sm:px-6 xl:px-8 mask-x-from-97%">
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
            "sticky top-[var(--page-sticky-top,0px)] z-sticky shrink-0 bg-background/90 backdrop-blur-md",
            !filters && "border-b border-border",
          )}
        >
          {titleBlock}
          {filtersBlock}
        </div>
      ) : (
        <>
          <div className="shrink-0">{titleBlock}</div>
          {filtersBlock}
        </>
      )}

      {noInternalScroll ? (
        <div className={cn("flex-1 min-h-0 overflow-hidden px-4 sm:px-6 xl:px-8 pt-4 pb-4", contentClassName)}>
          {children}
        </div>
      ) : (
        <div className={cn("px-4 sm:px-6 xl:px-8 pt-4 pb-10", contentClassName)}>{children}</div>
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
