import * as React from "react";

import { cn } from "../../lib/utils";
import type { Tone } from "../../lib/design/tones";

const sizes = {
  sm: { chip: "size-7", icon: "size-3.5" },
  md: { chip: "size-9", icon: "size-4.5" },
  lg: { chip: "size-14", icon: "size-6" },
} as const;

interface IconChipProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  /** Accepted and ignored: chips are no longer tinted (B7). */
  tone?: Tone;
  size?: keyof typeof sizes;
  className?: string;
}

/**
 * A small muted glyph. It used to be a tinted circle, which put a coloured
 * chip on every card; the redesign keeps the icon for scanning and drops the
 * colour (B1, B7). `tone` is still accepted so call sites keep working.
 * Decorative: label the surrounding element.
 */
function IconChip({ icon: Icon, size = "md", className }: IconChipProps) {
  return (
    <span
      data-slot="icon-chip"
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-muted-foreground",
        sizes[size].chip,
        className
      )}
    >
      <Icon className={sizes[size].icon} aria-hidden="true" />
    </span>
  );
}

export { IconChip };
export type { IconChipProps };
