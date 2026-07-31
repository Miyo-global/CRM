import { cn } from "@/lib/utils";

export const GOLD = "#bd882c";
export const BLUE = "#0f2b7f";
export const GOLD_LIGHT = "#d4a84a";
export const BLUE_LIGHT = "#1a3fa0";
export const SKIN = "#ffb8b8";
export const SKIN_SHADOW = "#e6a0a0";
export const HAIR = "#2f2e41";

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
