"use client";

import { useMemo, useState, useCallback } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableComboboxProps {
  options: readonly string[];
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  popoverClassName?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches.",
  disabled = false,
  className,
  popoverClassName,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);

  const display = useMemo(() => {
    if (!value) return null;
    return value;
  }, [value]);

  const handleSelect = useCallback(
    (v: string) => {
      onValueChange(v);
      setOpen(false);
    },
    [onValueChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal border-input h-9 px-3 data-[placeholder]:text-muted-foreground",
            !display && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate text-left">{display ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "min-w-[var(--radix-popover-trigger-width)] w-max max-w-[min(calc(100vw-2rem),20rem)] p-0 overflow-hidden",
          popoverClassName,
        )}
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command className="flex h-auto max-h-[min(320px,70vh)] min-h-0 w-full flex-col overflow-hidden" shouldFilter>
          <CommandInput placeholder={searchPlaceholder} className="h-9" />
          <CommandList className="max-h-[min(260px,60vh)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  keywords={[opt]}
                  onSelect={() => handleSelect(opt)}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === opt ? "opacity-100" : "opacity-0")} />
                  <span className="whitespace-nowrap">{opt}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
