import * as React from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/design/tones";
import type { LucideIcon } from "lucide-react";

interface DetailHeaderProps {
  back?: React.ReactNode;
  /** 64px avatar node; takes precedence over `icon`. */
  avatar?: React.ReactNode;
  icon?: LucideIcon;
  iconTone?: Tone;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Record header (§8.5): back slot, identity row (avatar/icon, title, status, meta) and action bar. */
function DetailHeader({
  back,
  avatar,
  icon,
  iconTone = "brand",
  title,
  subtitle,
  status,
  meta,
  actions,
  className,
}: DetailHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      {back}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {avatar ?? (icon ? React.createElement(icon, { className: "size-8 shrink-0 text-muted-foreground", "aria-hidden": true }) : null)}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words font-display text-2xl">{title}</h1>
            {status}
          </div>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">{meta}</div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

interface DetailLayoutProps {
  main: React.ReactNode;
  rail: React.ReactNode;
  className?: string;
}

/** Detail body (§8.5): main + 320px sticky rail on lg; rail stacks above main below lg. */
function DetailLayout({ main, rail, className }: DetailLayoutProps) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[1fr_320px]", className)}>
      <div className="min-w-0">{main}</div>
      <aside className="order-first space-y-4 lg:sticky lg:top-20 lg:order-none lg:self-start">{rail}</aside>
    </div>
  );
}

export { DetailHeader, DetailLayout };
export type { DetailHeaderProps, DetailLayoutProps };
