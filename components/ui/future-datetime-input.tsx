"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isPastDatetimeLocal, toDatetimeLocalValue } from "@/lib/date-utils";

interface FutureDatetimeInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange" | "min"> {
  value: string;
  onChange: (value: string) => void;
  /** When true, refresh the min bound (e.g. when a sheet opens). */
  active?: boolean;
  pastMessage?: string;
}

export function FutureDatetimeInput({
  value,
  onChange,
  active = true,
  pastMessage = "Date and time must be in the future",
  className,
  ...props
}: FutureDatetimeInputProps) {
  const [min, setMin] = useState(() => toDatetimeLocalValue());

  useEffect(() => {
    if (active) setMin(toDatetimeLocalValue());
  }, [active]);

  return (
    <div className="relative w-full">
      <CalendarDays
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="datetime-local"
        className={cn("pl-9 tabular-nums", className)}
        min={min}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (!next) {
            onChange("");
            return;
          }
          if (isPastDatetimeLocal(next)) {
            toast.error(pastMessage);
            return;
          }
          onChange(next);
        }}
        {...props}
      />
    </div>
  );
}
