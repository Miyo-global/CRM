import { cn } from "@/lib/utils";

// Theme-aware tokens (Gold & Ink §3.7). Names kept for backward compatibility.
export const GOLD = "var(--gold-400)";
export const BLUE = "var(--muted-foreground)";
export const GOLD_LIGHT = "var(--gold-300)";
export const BLUE_LIGHT = "var(--border-strong)";
export const SKIN = "var(--gold-200)";
export const SKIN_SHADOW = "var(--gold-300)";
export const HAIR = "var(--ink-700)";

export interface IllustrationProps {
  className?: string;
}

export function Wrapper({ className, children }: IllustrationProps & { children: React.ReactNode }) {
  return (
    <svg
      className={cn("w-32 h-32", className)}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
