"use client";

import { memo, useCallback } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AssigneeOption {
  id: string;
  name: string;
}

interface KanbanFilterBarProps {
  assigneeOptions: AssigneeOption[];
  filterAssignee: string;
  filterMinValue: string;
  filterMaxValue: string;
  hasActiveFilters: boolean;
  onAssigneeChange: (value: string) => void;
  onMinValueChange: (value: string) => void;
  onMaxValueChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
}

export const KanbanFilterBar = memo(function KanbanFilterBar({
  assigneeOptions,
  filterAssignee,
  filterMinValue,
  filterMaxValue,
  hasActiveFilters,
  onAssigneeChange,
  onMinValueChange,
  onMaxValueChange,
  onApply,
  onClear,
}: KanbanFilterBarProps) {
  const handleAssigneeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onAssigneeChange(e.target.value),
    [onAssigneeChange],
  );

  const handleMinValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onMinValueChange(e.target.value),
    [onMinValueChange],
  );

  const handleMaxValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onMaxValueChange(e.target.value),
    [onMaxValueChange],
  );

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-3">
      <Filter className="mb-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Assignee</label>
        <select
          value={filterAssignee}
          onChange={handleAssigneeChange}
          className="h-8 rounded-md border border-input bg-card px-2 text-xs outline-none focus-visible:focus-ring"
          aria-label="Filter by assignee"
        >
          <option value="all">All assignees</option>
          {assigneeOptions.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Min value (₹)</label>
        <Input
          value={filterMinValue}
          onChange={handleMinValueChange}
          placeholder="0"
          className="h-8 w-28 text-xs"
          type="number"
          min={0}
          aria-label="Minimum deal value"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Max value (₹)</label>
        <Input
          value={filterMaxValue}
          onChange={handleMaxValueChange}
          placeholder="Any"
          className="h-8 w-28 text-xs"
          type="number"
          min={0}
          aria-label="Maximum deal value"
        />
      </div>
      <Button size="sm" onClick={onApply}>
        Apply
      </Button>
      {hasActiveFilters && (
        <Button size="sm" variant="ghost" onClick={onClear}>
          <X />
          Clear
        </Button>
      )}
    </div>
  );
});
