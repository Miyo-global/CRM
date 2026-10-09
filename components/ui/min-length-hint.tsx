import { cn } from "../../lib/utils";

interface MinLengthHintProps {
  id: string;
  value: string;
  min?: number;
}

export function MinLengthHint({ id, value, min = 3 }: MinLengthHintProps) {
  const length = value.trim().length;
  const tooShort = length > 0 && length < min;
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute left-0 top-full z-10 mt-1 whitespace-nowrap text-xs text-muted-foreground",
        !tooShort && "sr-only",
      )}
    >
      Type at least {min} characters to search
    </p>
  );
}
