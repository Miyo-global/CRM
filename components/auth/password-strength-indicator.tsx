"use client";

import { Check, X } from "lucide-react";
import { type PasswordStrength, PASSWORD_REQUIREMENTS } from "@/lib/password-utils";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
}

const LEVEL_SEGMENTS: Record<PasswordStrength["level"], number> = {
  weak: 1,
  fair: 2,
  good: 3,
  strong: 4,
};

const LEVEL_TEXT: Record<PasswordStrength["level"], string> = {
  weak: "text-danger-strong",
  fair: "text-warning-strong",
  good: "text-info-strong",
  strong: "text-success-strong",
};

export function PasswordStrengthIndicator({ strength }: PasswordStrengthIndicatorProps) {
  const filled = LEVEL_SEGMENTS[strength.level];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-200",
                i <= filled ? strength.color : "bg-muted"
              )}
            />
          ))}
        </div>
        <span className={cn("text-xs font-medium capitalize", LEVEL_TEXT[strength.level])}>
          {strength.level}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PASSWORD_REQUIREMENTS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1.5">
            {strength.checks[key] ? (
              <Check className="size-3 text-success-strong" aria-hidden="true" />
            ) : (
              <X className="size-3 text-subtle-foreground" aria-hidden="true" />
            )}
            <span className={cn("text-xs", strength.checks[key] ? "text-success-strong" : "text-muted-foreground")}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
