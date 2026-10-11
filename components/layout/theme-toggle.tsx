"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

export type ThemeValue = "light" | "dark" | "system";

export const THEME_OPTIONS: { value: ThemeValue; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Returns the stored theme once mounted (undefined during SSR to avoid hydration mismatch). */
export function useMountedTheme() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return {
    theme: mounted ? ((theme as ThemeValue | undefined) ?? "system") : undefined,
    resolvedTheme: mounted ? resolvedTheme : undefined,
    setTheme: (t: ThemeValue) => setTheme(t),
  };
}

interface ThemeToggleProps {
  className?: string;
  /** "inverse" renders for ink surfaces (sidebar). */
  tone?: "default" | "inverse";
}

/** 3-way segmented control: Light / Dark / System. */
export function ThemeToggle({ className, tone = "default" }: ThemeToggleProps) {
  const { theme, setTheme } = useMountedTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full p-0.5",
        tone === "inverse" ? "bg-sidebar-accent" : "bg-muted",
        className,
      )}
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full transition-[color,background-color,box-shadow] duration-150 focus-visible:focus-ring",
              tone === "inverse"
                ? active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-muted hover:text-sidebar-accent-foreground"
                : active
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
