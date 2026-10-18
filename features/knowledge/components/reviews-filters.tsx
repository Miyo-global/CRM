"use client";

import { FilterChip } from "@/components/ui/filter-chip";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useOrgMembers } from "@/lib/api/hooks/organization";

/** KB-0087: narrow the review queue by type and reviewer. */
export function ReviewsFilters({
  type,
  reviewerId,
  onTypeChange,
  onReviewerChange,
}: {
  type: string | null;
  reviewerId: string;
  onTypeChange: (type: "approval" | "freshness" | null) => void;
  onReviewerChange: (reviewerId: string) => void;
}) {
  const members = useOrgMembers(1, 100);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChip
        active={type === "approval"}
        onClick={() => onTypeChange(type === "approval" ? null : "approval")}
      >
        Approval
      </FilterChip>
      <FilterChip
        active={type === "freshness"}
        onClick={() => onTypeChange(type === "freshness" ? null : "freshness")}
      >
        Freshness
      </FilterChip>

      <SearchableSelect
        value={reviewerId}
        onValueChange={onReviewerChange}
        options={(members.data?.data ?? []).map((member) => ({
          value: member.userId,
          label: member.name ?? member.email,
          keywords: member.email,
        }))}
        placeholder="Any reviewer"
        triggerClassName="h-8 w-44"
      />
    </div>
  );
}
