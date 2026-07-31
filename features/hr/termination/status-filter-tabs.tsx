"use client";

import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STATUS_FILTER_OPTIONS, type StatusFilter } from "./termination-utils";

interface FilterTabButtonProps {
  value: StatusFilter;
  label: string;
  isActive: boolean;
  count: number;
  onFilterChange: (value: StatusFilter) => void;
}

const FilterTabButton = memo(function FilterTabButton({
  value,
  label,
  isActive,
  count,
  onFilterChange,
}: FilterTabButtonProps) {
  const handleClick = useCallback(() => {
    onFilterChange(value);
  }, [onFilterChange, value]);

  return (
    <Button
      size="sm"
      variant={isActive ? "default" : "outline"}
      className="h-7 text-xs"
      onClick={handleClick}
    >
      {label}
      {count > 0 && (
        <Badge
          variant={isActive ? "secondary" : "outline"}
          className="ml-1.5 text-[9px] px-1.5 py-0 h-4"
        >
          {count}
        </Badge>
      )}
    </Button>
  );
});

interface StatusFilterTabsProps {
  statusFilter: StatusFilter;
  statusCounts: Record<string, number>;
  onFilterChange: (value: StatusFilter) => void;
}

export function StatusFilterTabs({
  statusFilter,
  statusCounts,
  onFilterChange,
}: StatusFilterTabsProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-4">
      {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
        <FilterTabButton
          key={value}
          value={value}
          label={label}
          isActive={statusFilter === value}
          count={statusCounts[value] ?? 0}
          onFilterChange={onFilterChange}
        />
      ))}
    </div>
  );
}
