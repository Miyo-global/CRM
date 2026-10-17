"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs, useAutoBreadcrumbs, type Crumb } from "./breadcrumbs";

/**
 * One page container for every page, so widths line up across the app (B1).
 * Forms opt into the narrower measure with `contentClassName="max-w-[720px]"`.
 */
export const PAGE_CONTAINER = "mx-auto w-full max-w-[1200px] px-6";

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
    <div className={cn(PAGE_CONTAINER, "pt-6 pb-4")}>
      {/* Auto crumbs duplicate the topbar's on lg+; explicit crumbs always render. */}
      {crumbs.length > 0 && (
        <Breadcrumbs items={crumbs} className={cn("mb-2", breadcrumbs === undefined && "lg:hidden")} />
      )}
      {/* R3-0201: actions sat beside the title from 1024 and overlapped it
          (/hr/documents has five). They now share the row from 1280. */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
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
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 xl:shrink-0 xl:justify-end [&>div]:flex-wrap [&>div]:max-w-full">
            {actions}
          </div>
        )}
      </div>
    </div>
  );

  const filtersBlock = filters ? (
    <div className="shrink-0 border-y border-border bg-background">
      <div className={cn(PAGE_CONTAINER, "flex items-center gap-3 overflow-x-auto overflow-y-visible overscroll-x-contain py-2 mask-x-from-97%")}>
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
        <div className={cn(PAGE_CONTAINER, "flex-1 min-h-0 overflow-hidden pt-4 pb-4", contentClassName)}>
          {children}
        </div>
      ) : (
        <div className={cn(PAGE_CONTAINER, "pt-4 pb-10", contentClassName)}>{children}</div>
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
