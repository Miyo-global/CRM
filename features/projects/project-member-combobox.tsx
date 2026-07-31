"use client";

import { useState, useMemo, useCallback } from "react";
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
import {
  projectMemberLabel,
  projectMemberUserId,
  type ProjectMemberSelectRow,
} from "@/lib/projects/project-member-select";

function Check({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronsUpDown({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg className={className} {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

export interface ProjectMemberComboboxProps {
  members: ProjectMemberSelectRow[];
  value: string;
  onValueChange: (userId: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  allowClear?: boolean;
  clearLabel?: string;
}

export function ProjectMemberCombobox({
  members,
  value,
  onValueChange,
  placeholder = "Select member…",
  disabled = false,
  className,
  id,
  allowClear = true,
  clearLabel = "No lead",
}: ProjectMemberComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => members.find((m) => projectMemberUserId(m) === value),
    [members, value],
  );

  const handleSelect = useCallback(
    (uid: string) => {
      onValueChange(uid || undefined);
      setOpen(false);
    },
    [onValueChange],
  );

  if (!members.length) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        id={id}
        className={cn(
          "h-9 w-full justify-between font-normal text-muted-foreground border-input",
          className,
        )}
      >
        <span className="truncate text-left">No project members</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={placeholder}
          disabled={disabled}
          id={id}
          className={cn(
            "h-9 w-full justify-between font-normal border-input data-[placeholder]:text-muted-foreground",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate text-left">
            {selected ? projectMemberLabel(selected) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name or email…" className="h-9" />
          <CommandList>
            <CommandEmpty>No member found.</CommandEmpty>
            <CommandGroup>
              {allowClear ? (
                <CommandItem
                  value={`${clearLabel} __clear__`}
                  onSelect={() => handleSelect("")}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4 shrink-0", value === "" ? "opacity-100" : "opacity-0")}
                  />
                  {clearLabel}
                </CommandItem>
              ) : null}
              {members.map((m) => {
                const uid = projectMemberUserId(m);
                const label = projectMemberLabel(m);
                const role = m.role?.trim() ?? "";
                return (
                  <CommandItem
                    key={uid}
                    value={`${label} ${uid} ${role} ${m.email ?? ""}`.trim()}
                    onSelect={() => handleSelect(uid)}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4 shrink-0", value === uid ? "opacity-100" : "opacity-0")}
                    />
                    <span className="truncate">{label}</span>
                    {role ? (
                      <span className="ml-1.5 truncate text-xs text-muted-foreground">({role})</span>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
