"use client";

import { useMemo, useState, useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
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
import { comboboxTriggerClassName } from "@/components/ui/searchable-select";
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
            comboboxTriggerClassName,
            !display && "text-subtle-foreground",
            className,
          )}
        >
          <span className="truncate text-left">{display ?? placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
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
        <Command className="flex h-auto max-h-[min(22rem,70vh)] min-h-0 w-full flex-col overflow-hidden" shouldFilter>
          <CommandInput placeholder={searchPlaceholder} className="h-10" />
          <CommandList className="max-h-[min(18rem,60vh)] min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  keywords={[opt]}
                  onSelect={() => handleSelect(opt)}
                >
                  <Check className={cn("size-4 shrink-0 text-brand-text", value === opt ? "opacity-100" : "opacity-0")} />
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
