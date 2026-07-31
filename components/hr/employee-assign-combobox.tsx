"use client";

import { useState, useMemo, useCallback } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface EmployeeAssignOption {
  id: string;
  name: string;
  subtitle?: string;
}

interface EmployeeAssignComboboxProps {
  employees: EmployeeAssignOption[];
  value: string;
  onValueChange: (userId: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  showUnassigned?: boolean;
  disabled?: boolean;
  className?: string;
}

export function EmployeeAssignCombobox({
  employees,
  value,
  onValueChange,
  placeholder = "Unassigned",
  searchPlaceholder = "Search by name…",
  ariaLabel = "Assign to employee",
  showUnassigned = true,
  disabled = false,
  className,
}: EmployeeAssignComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => employees.find((e) => e.id === value),
    [employees, value],
  );

  const handleSelect = useCallback(
    (id: string) => {
      onValueChange(id);
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
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal border-input data-[placeholder]:text-muted-foreground",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate text-left">
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command className="flex h-auto max-h-[min(300px,70vh)] min-h-0 w-full flex-col overflow-hidden">
          <CommandInput placeholder={searchPlaceholder} className="h-9 shrink-0" />
          <CommandList
            className="max-h-[min(240px,60vh)] min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {showUnassigned && (
                <CommandItem
                  value="Unassigned none clear"
                  onSelect={() => handleSelect("")}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", value === "" ? "opacity-100" : "opacity-0")} />
                  Unassigned
                </CommandItem>
              )}
              {employees.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={`${emp.name} ${emp.subtitle ?? ""} ${emp.id}`}
                  onSelect={() => handleSelect(emp.id)}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4 shrink-0", value === emp.id ? "opacity-100" : "opacity-0")}
                  />
                  {emp.subtitle ? (
                    <span className="flex flex-col">
                      <span>{emp.name}</span>
                      <span className="text-xs text-muted-foreground">{emp.subtitle}</span>
                    </span>
                  ) : (
                    <span className="truncate">{emp.name}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
