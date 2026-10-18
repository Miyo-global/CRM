"use client";

import { useMemo, useState } from "react";

import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import { useKbPageOwners, useKbPages, useKbSpaces } from "@/lib/api/hooks/knowledge";

import { KB_CONTENT_TYPE_LABELS } from "../lib/kb-labels";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";

const STATUS_FILTERS = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "archived", label: "Archived" },
];

const SORTS: SearchableSelectOption[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest" },
  { value: "title", label: "Title A–Z" },
];

const TYPE_OPTIONS: SearchableSelectOption[] = Object.entries(KB_CONTENT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

/** KB-0070: every page the viewer can see, with the filters and sort. */
export function WikiHomeAllPages() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [spaceId, setSpaceId] = useState<string>("");
  const [sort, setSort] = useState("updated");

  const owners = useKbPageOwners();
  const spaces = useKbSpaces();

  const { data, isLoading } = useKbPages({
    q: q.trim() || undefined,
    status: status ?? undefined,
    contentType: contentType || undefined,
    ownerId: ownerId || undefined,
    spaceId: spaceId ? Number(spaceId) : undefined,
    sort,
    limit: 50,
  });

  const ownerNames = useMemo(
    () => new Map((owners.data?.items ?? []).map((o) => [o.id, o.name ?? "—"])),
    [owners.data],
  );

  const ownerOptions: SearchableSelectOption[] = (owners.data?.items ?? []).map((o) => ({
    value: o.id,
    label: o.name ?? o.id,
  }));

  const spaceOptions: SearchableSelectOption[] = (spaces.data?.items ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  const filtered = !!(q.trim() || status || contentType || ownerId || spaceId);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-foreground">All pages</h2>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Filter by title"
          className="h-8 w-full sm:w-56"
        />
        {STATUS_FILTERS.map((option) => (
          <FilterChip
            key={option.value}
            active={status === option.value}
            onClick={() => setStatus(status === option.value ? null : option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
        <SearchableSelect
          value={contentType}
          onValueChange={setContentType}
          options={TYPE_OPTIONS}
          placeholder="Any type"
          triggerClassName="h-8 w-40"
        />
        <SearchableSelect
          value={ownerId}
          onValueChange={setOwnerId}
          options={ownerOptions}
          placeholder="Any owner"
          triggerClassName="h-8 w-40"
        />
        <SearchableSelect
          value={spaceId}
          onValueChange={setSpaceId}
          options={spaceOptions}
          placeholder="Any space"
          triggerClassName="h-8 w-40"
        />
        <SearchableSelect
          value={sort}
          onValueChange={setSort}
          options={SORTS}
          triggerClassName="h-8 w-44 sm:ml-auto"
        />
      </div>

      <WikiPageCollectionTable
        pages={data?.items ?? []}
        ownerNames={ownerNames}
        emptyMessage={
          isLoading
            ? "Loading…"
            : filtered
              ? "No pages match these filters."
              : "No pages yet. Create the first one."
        }
      />
    </section>
  );
}
