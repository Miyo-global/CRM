import * as React from "react";

import { cn } from "../../lib/utils";
import { toneSoft, type Tone } from "../../lib/design/tones";

const sizes = {
  sm: { chip: "size-7", icon: "size-3.5" },
  md: { chip: "size-9", icon: "size-4.5" },
  lg: { chip: "size-14", icon: "size-6" },
} as const;

interface IconChipProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  tone?: Tone;
  size?: keyof typeof sizes;
  className?: string;
}

/** Circular tinted icon chip (logo circle motif). Decorative: label the surrounding element. */
function IconChip({ icon: Icon, tone = "brand", size = "md", className }: IconChipProps) {
  return (
    <span
      data-slot="icon-chip"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        toneSoft[tone],
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
