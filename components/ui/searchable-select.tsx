"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  /** Max height for the scrollable options list (default: min(260px, 60vh)). */
  listMaxHeight?: string;
  /** Tighter option rows for compact forms. */
  compact?: boolean;
  /** Portal popover into a parent (e.g. sheet) so the list scrolls under modal scroll-lock. */
  popoverContainer?: HTMLElement | null;
}

export interface SearchableSelectOption {
  value: string;
  label: string;
  /** Extra text used for search matching (role, email, department, etc.). */
  keywords?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  className,
  triggerClassName,
  disabled = false,
  listMaxHeight = "min(260px, 60vh)",
  compact = false,
  popoverContainer,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between text-sm font-normal",
            !selected && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 overflow-hidden", className)}
        align="start"
        container={popoverContainer ?? undefined}
        collisionPadding={16}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <Command className="flex h-auto max-h-[min(320px,70vh)] min-h-0 w-full flex-col overflow-hidden" shouldFilter>
          <CommandInput placeholder={searchPlaceholder} className="h-9 shrink-0" />
          <CommandList
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
            style={{ maxHeight: listMaxHeight }}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.keywords ?? ""}`.trim()}
                  className={cn(compact && "py-1.5 text-sm")}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
