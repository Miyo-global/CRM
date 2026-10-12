"use client";

import { useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  comboboxTriggerClassName,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";

/** Chips rendered before collapsing the rest into a "+N more" chip. */
const MAX_VISIBLE_CHIPS = 8;

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
              comboboxTriggerClassName,
              values.length === 0 && "text-subtle-foreground",
              triggerClassName,
            )}
          >
            <span className="truncate">{triggerText}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
      <PopoverContent
        className={cn("w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden", className)}
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command className="flex h-auto max-h-[min(22rem,70vh)] min-h-0 w-full flex-col overflow-hidden" shouldFilter>
          <CommandInput placeholder={searchPlaceholder} className="h-10 shrink-0" />
          <CommandList
            className="max-h-[min(18rem,60vh)] min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
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
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-xs border border-dashed border-border-strong">
                      <X className="size-3" />
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
                        className="pointer-events-none"
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
          {values.slice(0, MAX_VISIBLE_CHIPS).map((value) => {
            const label = optionByValue.get(value)?.label ?? value;
            return (
              <Badge key={value} variant="secondary" className="max-w-full gap-0.5 pr-0.5">
                <span className="truncate">{label}</span>
                <button
                  type="button"
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:focus-ring"
                  aria-label={`Remove ${label}`}
                  onClick={() => removeValue(value)}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
          {values.length > MAX_VISIBLE_CHIPS ? (
            <Badge variant="outline">+{values.length - MAX_VISIBLE_CHIPS} more</Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
