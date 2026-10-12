import * as React from "react";

import type { Tone } from "../../lib/design/tones";
import { Badge, type BadgeVariant } from "./badge";

const toneVariant: Record<Tone, BadgeVariant> = {
  neutral: "secondary",
  brand: "default",
  success: "success",
  warning: "warning",
  danger: "destructive",
  info: "info",
  teal: "teal",
  plum: "plum",
};

interface StatusPillProps {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

/** Soft status pill — the single renderer for every status/tone map. */
function StatusPill({ tone, children, dot, className }: StatusPillProps) {
  return (
    <Badge variant={toneVariant[tone]} dot={dot} className={className}>
      {children}
    </Badge>
  );
}

export { StatusPill };
export type { StatusPillProps };
