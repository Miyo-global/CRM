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
    <div className="relative flex-1 max-w-sm">
      <Search
        className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
        aria-hidden
      />
      <Input
        placeholder="Search employees"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 h-9 w-full text-sm"
        aria-label="Search employees by name, email or employee ID"
        aria-describedby="employees-search-hint"
      />
      <MinLengthHint id="employees-search-hint" value={value} />
    </div>
  );
}
