import { cn } from "../../lib/utils";

interface MinLengthHintProps {
  id: string;
  value: string;
  min?: number;
}

/** Visible only while the trimmed value is non-empty but shorter than `min`. */
export function MinLengthHint({ id, value, min = 3 }: MinLengthHintProps) {
  const length = value.trim().length;
  const tooShort = length > 0 && length < min;
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute left-0 top-full z-sticky mt-1 whitespace-nowrap text-2xs text-subtle-foreground",
        !tooShort && "sr-only",
      )}
    >
      Type at least {min} characters to search
    </p>
  );
}
