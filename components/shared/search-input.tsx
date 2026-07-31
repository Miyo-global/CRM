"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounce";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  debounce = 300,
  className,
  disabled,
  autoFocus,
}: SearchInputProps) {
  const [local, setLocal] = React.useState(value);
  const debouncedLocal = useDebouncedValue(local, debounce);

  React.useEffect(() => {
    onChange(debouncedLocal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLocal]);

  React.useEffect(() => {
    if (value !== local) setLocal(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <Input
        className="pl-9"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </div>
  );
}
