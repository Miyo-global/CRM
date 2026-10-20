import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design/tones";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface WidgetCardProps {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  count?: number;
  viewAllHref?: string;
  viewAllLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Dashboard widget shell (§6.2): icon chip, title, count badge, "View all →" link, body. */
function WidgetCard({
  title,
  icon,
  tone = "brand",
  count,
  viewAllHref,
  viewAllLabel = "View all",
  actions,
  children,
  className,
  contentClassName,
}: WidgetCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {icon ? React.createElement(icon, { className: "size-4 shrink-0 text-muted-foreground", "aria-hidden": true }) : null}
        {/* h2: widgets sit straight under the page h1; h3 skipped a level (QA-A11Y-02). */}
        <h2 className="min-w-0 truncate font-sans text-sm font-semibold tracking-normal">{title}</h2>
        {count !== undefined && (
          <Badge variant="secondary" className="tabular-nums">
            {count}
          </Badge>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-brand-text hover:underline focus-visible:focus-ring outline-none"
            >
              {viewAllLabel}
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
      <div className={cn("flex-1 px-4 pb-4", contentClassName)}>{children}</div>
    </Card>
  );
}

interface WidgetListRowProps {
  leading?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}

/** 44px widget list row: leading avatar/icon, title + meta, trailing pill; link/button when interactive. */
function WidgetListRow({ leading, title, meta, trailing, href, onClick, className }: WidgetListRowProps) {
  const classes = cn(
    "flex min-h-11 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left",
    (href || onClick) && "transition-colors hover:bg-accent focus-visible:focus-ring outline-none",
    className
  );
  const inner = (
    <>
      {leading && <span className="flex shrink-0 items-center">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {meta && <span className="block truncate text-xs text-muted-foreground">{meta}</span>}
      </span>
      {trailing && <span className="flex shrink-0 items-center gap-2">{trailing}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className={classes}>{inner}</div>;
}

export { WidgetCard, WidgetListRow };
export type { WidgetCardProps, WidgetListRowProps };
