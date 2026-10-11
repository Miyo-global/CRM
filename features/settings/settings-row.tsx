import * as React from "react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface SettingsSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Danger zone styling (§8.7). */
  danger?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Settings card (§8.7): header + rows divided by borders. */
export function SettingsSection({ title, description, actions, danger, children, className }: SettingsSectionProps) {
  return (
    <Card className={cn("overflow-hidden", danger && "border-danger-soft", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className={cn("text-sm font-semibold", danger ? "text-destructive" : "text-foreground")}>{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </Card>
  );
}

interface SettingRowProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Control rendered on the right (switch/select/button). */
  control?: React.ReactNode;
  /** Associates the title with a control (renders a <label>). */
  htmlFor?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/** One setting: title + description left, control right; stacks on narrow screens. */
export function SettingRow({ title, description, control, htmlFor, icon, children, className }: SettingRowProps) {
  const Title = htmlFor ? "label" : "p";
  return (
    <div className={cn("px-5 py-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          {icon}
          <div className="min-w-0">
            <Title htmlFor={htmlFor} className={cn("text-sm font-medium text-foreground", htmlFor && "cursor-pointer")}>
              {title}
            </Title>
            {description && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{description}</p>}
          </div>
        </div>
        {control && <div className="flex shrink-0 flex-wrap items-center gap-2">{control}</div>}
      </div>
      {children}
    </div>
  );
}
