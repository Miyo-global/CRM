"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
        placeholder="Search name, email, or employee ID (min 3 chars)…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 h-9 w-full text-sm"
        aria-label="Search employees"
      />
    </div>
  );
}
