"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

interface PlatformTabProps {
  value: string;
  label: string;
  isActive: boolean;
  onClick: (value: string) => void;
}

export const PlatformTab = memo(function PlatformTab({
  value,
  label,
  isActive,
  onClick,
}: PlatformTabProps) {
  function handleClick() {
    onClick(value);
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
        isActive
          ? "bg-gold text-white border-gold"
          : "bg-transparent text-muted-foreground border-border hover:border-gold/50",
      )}
      aria-pressed={isActive}
    >
      {label}
    </button>
  );
});
