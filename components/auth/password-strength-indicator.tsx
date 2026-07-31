"use client";

import { Check, X } from "lucide-react";
import { type PasswordStrength, PASSWORD_REQUIREMENTS } from "@/lib/password-utils";

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
}

export function PasswordStrengthIndicator({ strength }: PasswordStrengthIndicatorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.percentage}%` }}
          />
        </div>
        <span className={`text-xs font-medium capitalize ${
          strength.level === "strong" ? "text-green-600" :
          strength.level === "good" ? "text-blue-600" :
          strength.level === "fair" ? "text-yellow-600" : "text-red-600"
        }`}>
          {strength.level}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PASSWORD_REQUIREMENTS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1">
            {strength.checks[key] ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground/40" />
            )}
            <span className={`text-xs ${strength.checks[key] ? "text-green-600" : "text-muted-foreground"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
