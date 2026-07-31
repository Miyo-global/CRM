import * as React from "react";
import { Badge } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

interface StatusBadgeProps<T extends string> {
  status: T;
  map: Record<T, StatusConfig>;
  fallbackLabel?: string;
}

/**
 * Generic status badge driven by a config map.
 * Eliminates per-feature status→color mapping objects scattered in 5+ files.
 *
 * @example
 * const LEAVE_STATUS_MAP = {
 *   PENDING:  { label: 'Pending',  variant: 'secondary' },
 *   APPROVED: { label: 'Approved', variant: 'default' },
 *   REJECTED: { label: 'Rejected', variant: 'destructive' },
 * } satisfies Record<LeaveStatus, StatusConfig>;
 *
 * <StatusBadge status={leave.status} map={LEAVE_STATUS_MAP} />
 */
export function StatusBadge<T extends string>({
  status,
  map,
  fallbackLabel,
}: StatusBadgeProps<T>) {
  const config = map[status];
  if (!config) {
    return (
      <Badge variant="outline">
        {fallbackLabel ?? status}
      </Badge>
    );
  }
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

export type { StatusConfig, BadgeVariant };
