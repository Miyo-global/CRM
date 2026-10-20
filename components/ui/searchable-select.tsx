"use client";

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
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
  /** Max height for the scrollable options list (default: min(18rem, 60vh)). */
  listMaxHeight?: string;
  /** Tighter option rows for compact forms. */
  compact?: boolean;
  /** Portal popover into a parent (e.g. sheet) so the list scrolls under modal scroll-lock. */
  popoverContainer?: HTMLElement | null;
  /** Accessible name; a combobox is not named by its text. Defaults to `placeholder`. */
  "aria-label"?: string;
}

/** Input-style trigger shared by the searchable select family (matches SelectTrigger). */
export const comboboxTriggerClassName =
  "h-9 w-full justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm font-normal text-foreground shadow-xs transition-[color,background-color,border-color,box-shadow] duration-150 hover:bg-card focus-visible:border-ring focus-visible:focus-ring aria-invalid:border-destructive aria-invalid:[--ring:var(--destructive)] active:scale-100";

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
  listMaxHeight = "min(18rem, 60vh)",
  compact = false,
  popoverContainer,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
          // Radix points aria-controls at the content even while it is not
          // mounted, an invalid ARIA reference (QA-A11Y-02).
          aria-controls={open ? contentId : undefined}
          disabled={disabled}
          className={cn(
            comboboxTriggerClassName,
            !selected && "text-subtle-foreground",
            triggerClassName,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        id={contentId}
        className={cn("p-0 overflow-hidden", className)}
        align="start"
        container={popoverContainer ?? undefined}
        collisionPadding={16}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <Command className="flex h-auto max-h-[min(22rem,70vh)] min-h-0 w-full flex-col overflow-hidden" shouldFilter>
          <CommandInput placeholder={searchPlaceholder} className="h-10 shrink-0" />
          <CommandList
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
            style={{ maxHeight: listMaxHeight }}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.keywords ?? ""}`.trim()}
                  className={cn(compact && "min-h-8 px-2 py-1.5")}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0 text-brand-text",
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
