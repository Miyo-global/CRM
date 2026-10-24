import { cn } from "@/lib/utils";

/** "n/max" under a text field, red at the limit, so maxLength never cuts text silently (R3-LEN-01). */
export function CharCount({ length, max, className }: { length: number; max: number; className?: string }) {
  const atMax = length >= max;
  return (
    <p
      aria-live="polite"
      className={cn(
        "text-right text-xs tabular-nums",
        atMax ? "font-medium text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {length}/{max}
      {atMax ? " (limit reached)" : ""}
    </p>
  );
}
