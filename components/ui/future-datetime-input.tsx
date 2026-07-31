"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
  ...props
}: FutureDatetimeInputProps) {
  const [min, setMin] = useState(() => toDatetimeLocalValue());

  useEffect(() => {
    if (active) setMin(toDatetimeLocalValue());
  }, [active]);

  return (
    <Input
      type="datetime-local"
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
  );
}
