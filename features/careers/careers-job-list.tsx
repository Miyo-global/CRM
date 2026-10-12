"use client";

import { useMemo, useState } from "react";
import { Building2, Briefcase, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { CareersJobCard } from "@/features/careers/careers-job-card";
import { Button } from "@/components/ui/button";
import { IconChip } from "@/components/ui/icon-chip";
import { Input } from "@/components/ui/input";
import { formatJobTypeLabel } from "@/lib/hr/job-posting-format";
import { cn } from "@/lib/utils";
import type { PublicJobPosting } from "@/server/queries/public";

export type CareersJobListItem = {
  job: PublicJobPosting;
  departmentName: string | null;
};

const ALL = "__all";
const MIN_SEARCH_LEN = 3;

const FILTER_SELECT =
  "h-9 w-full appearance-none rounded-md border border-input bg-card pl-9 pr-8 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] focus-visible:focus-ring focus-visible:border-ring";

export function CareersJobList({ items }: { items: CareersJobListItem[] }) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState(ALL);
  const [type, setType] = useState(ALL);

  const deptOptions = useMemo(
    () =>
      [...new Set(items.map((i) => i.departmentName).filter((d): d is string => !!d))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [items],
  );

  const typeOptions = useMemo(
    () =>
      [...new Set(items.map((i) => i.job.type).filter((t): t is string => !!t))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searchActive = q.length >= MIN_SEARCH_LEN;
    return items.filter(({ job, departmentName }) => {
      if (dept !== ALL && departmentName !== dept) return false;
      if (type !== ALL && job.type !== type) return false;
      if (!searchActive) return true;
      return [job.title, job.location, job.experience, departmentName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [items, query, dept, type]);

  const hasActiveFilters = query.trim() !== "" || dept !== ALL || type !== ALL;
  const searchTooShort =
    query.trim().length > 0 && query.trim().length < MIN_SEARCH_LEN;

  function clearFilters() {
    setQuery("");
    setDept(ALL);
    setType(ALL);
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-14 z-sticky -mx-4 border-b border-border bg-background/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <IconChip icon={SlidersHorizontal} size="sm" />
            <div>
              <p className="text-sm font-semibold leading-none">Find a role</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Search by title, location, or experience
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_minmax(0,11rem)_minmax(0,11rem)]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roles"
                aria-label="Search jobs"
                aria-describedby="careers-search-hint"
                className={cn("pl-9", searchTooShort && "border-warning-strong focus-visible:border-warning-strong")}
              />
            </div>

            <div className="relative">
              <Building2
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                aria-label="Filter by department"
                className={FILTER_SELECT}
              >
                <option value={ALL}>All departments</option>
                {deptOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Briefcase
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                aria-label="Filter by type"
                className={FILTER_SELECT}
              >
                <option value={ALL}>All types</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>
                    {formatJobTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {searchTooShort && (
            <p id="careers-search-hint" className="mt-3 text-xs text-warning-strong">
              Type at least {MIN_SEARCH_LEN} characters to search.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-bold tracking-tight">Open positions</h2>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-soft px-2 text-2xs font-semibold tabular-nums text-brand-soft-foreground">
            {filtered.length}
          </span>
        </div>
        {hasActiveFilters && (
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            <RotateCcw className="size-3.5" aria-hidden />
            Clear filters
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-card px-6 py-16 text-center">
          <IconChip icon={Search} tone="neutral" size="lg" className="mx-auto mb-4" />
          <p className="font-display text-lg font-bold">No roles match your filters</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Try another keyword, department, or employment type — or clear filters to see
            everything.
          </p>
          {hasActiveFilters && (
            <Button type="button" onClick={clearFilters} className="mt-6">
              <RotateCcw className="size-3.5" aria-hidden />
              Show all roles
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3" role="list">
          {filtered.map(({ job, departmentName }) => (
            <li key={job.id}>
              <CareersJobCard job={job} departmentName={departmentName} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
