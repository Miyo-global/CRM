"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";

interface SearchableMultiSelectProps {
  options: SearchableSelectOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  selectedLabel?: (count: number) => string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function SearchableMultiSelect({
  options,
  values,
  onValuesChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  selectedLabel = (count) => `${count} selected`,
  className,
  triggerClassName,
  disabled = false,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const optionByValue = useMemo(
    () => new Map(options.map((o) => [o.value, o])),
    [options],
  );

  const triggerText = useMemo(() => {
    if (values.length === 0) return placeholder;
    if (values.length === 1) return optionByValue.get(values[0]!)?.label ?? selectedLabel(1);
    return selectedLabel(values.length);
  }, [values, optionByValue, placeholder, selectedLabel]);

  const toggleValue = (value: string) => {
    onValuesChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );
  };

  const removeValue = (value: string) => {
    onValuesChange(values.filter((v) => v !== value));
  };

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-9 w-full justify-between text-sm font-normal",
              values.length === 0 && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <span className="truncate">{triggerText}</span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      <PopoverContent
        className={cn("w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden", className)}
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command className="flex h-auto max-h-[min(320px,70vh)] min-h-0 w-full flex-col overflow-hidden" shouldFilter>
          <CommandInput placeholder={searchPlaceholder} className="h-9 shrink-0" />
          <CommandList
            className="max-h-[min(260px,60vh)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
            onWheel={(e) => e.stopPropagation()}
          >
              <CommandEmpty>{emptyText}</CommandEmpty>
              {values.length > 0 ? (
                <CommandGroup>
                  <CommandItem
                    value="clear all selection"
                    onSelect={() => onValuesChange([])}
                    className="text-muted-foreground"
                  >
                    <span className="mr-2 flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-dashed border-muted-foreground/40">
                      <X className="h-3 w-3" />
                    </span>
                    Clear selection
                  </CommandItem>
                </CommandGroup>
              ) : null}
              <CommandGroup>
                {options.map((opt) => {
                  const selected = values.includes(opt.value);
                  return (
                    <CommandItem
                      key={opt.value}
                      value={opt.label}
                      onSelect={() => toggleValue(opt.value)}
                      className="gap-2"
                    >
                      <Checkbox
                        checked={selected}
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none rounded-[3px]"
                      />
                      <span className="truncate">{opt.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => {
            const label = optionByValue.get(value)?.label ?? value;
            return (
              <span
                key={value}
                className="inline-flex max-w-full items-center gap-1 rounded-[3px] border bg-muted/40 px-2 py-1 text-xs"
              >
                <Checkbox checked tabIndex={-1} aria-hidden className="pointer-events-none size-3.5 rounded-[2px]" />
                <span className="truncate">{label}</span>
                <button
                  type="button"
                  className="ml-0.5 rounded-[2px] p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${label}`}
                  onClick={() => removeValue(value)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
