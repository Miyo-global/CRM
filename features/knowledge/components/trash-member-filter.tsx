"use client";

import { FilterChip } from "@/components/ui/filter-chip";
import { useKbTrashDeleters } from "@/lib/api/hooks/knowledge";

/** KB-0086: narrow the trash to one person's deletions. */
export function TrashMemberFilter({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const { data } = useKbTrashDeleters();
  const deleters = (data?.items ?? []).filter((row) => row.id);

  if (deleters.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {deleters.map((row) => (
        <FilterChip
          key={row.id}
          active={value === row.id}
          count={row.pages}
          onClick={() => onChange(value === row.id ? null : (row.id as string))}
        >
          {row.name ?? "Someone who left"}
        </FilterChip>
      ))}
    </div>
  );
}
