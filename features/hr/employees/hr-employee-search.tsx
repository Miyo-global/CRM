"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { MinLengthHint } from "@/components/ui/min-length-hint";

interface HrEmployeeSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function HrEmployeeSearch({ value, onChange }: HrEmployeeSearchProps) {
  return (
    <div className="relative w-full sm:w-64">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground"
        aria-hidden
      />
      <Input
        placeholder="Search employees"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="search"
        data-page-search
        className="h-9 w-full pl-9"
        aria-label="Search employees by name, email or employee ID"
        aria-describedby="employees-search-hint"
      />
      <MinLengthHint id="employees-search-hint" value={value} />
    </div>
  );
}
