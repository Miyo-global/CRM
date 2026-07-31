"use client";

import { useMemo, useState } from "react";
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
import { buildBonusEmployeeOptions } from "@/lib/hr/bonus-employee-options";
import type { Employee } from "@/types/hr";

const LIST_MAX_HEIGHT = "200px";

interface BonusEmployeePickerProps {
  employees: Employee[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function BonusEmployeePicker({
  employees,
  value,
  onValueChange,
  disabled = false,
}: BonusEmployeePickerProps) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => buildBonusEmployeeOptions(employees), [employees]);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="bonus-employee"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between text-sm font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="truncate">{selected ? selected.name : "Select employee…"}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,400px)] overflow-hidden p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command className="flex h-auto max-h-[min(280px,65vh)] min-h-0 w-full flex-col overflow-hidden" shouldFilter>
          <CommandInput placeholder="Search by name, email, role, department…" className="h-9 shrink-0" />
          <CommandList
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
            style={{ maxHeight: LIST_MAX_HEIGHT }}
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>No employees found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.keywords}
                  className="py-1.5"
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5 shrink-0",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate">{option.name}</span>
                    {option.secondaryLabel ? (
                      <span className="truncate text-xs text-muted-foreground">{option.secondaryLabel}</span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
