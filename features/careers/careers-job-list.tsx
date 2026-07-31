"use client";

import { useMemo, useState } from "react";
import { Building2, Briefcase, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { CareersJobCard } from "@/features/careers/careers-job-card";
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
  "h-10 w-full appearance-none rounded-xl border border-border/80 bg-background/80 pl-9 pr-8 text-sm text-foreground shadow-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/15";

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
      <div className="sticky top-16 z-30 -mx-4 border-b border-border/50 bg-background/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="rounded-2xl border border-border/60 bg-card/50 p-4 shadow-soft sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
            </div>
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
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roles (min. 3 characters)…"
                aria-label="Search jobs"
                className={cn(
                  "h-10 w-full rounded-xl border border-border/80 bg-background/80 pl-9 pr-3 text-sm shadow-sm outline-none transition",
                  "focus:border-primary/50 focus:ring-2 focus:ring-primary/15",
                  searchTooShort && "border-amber-500/40 focus:border-amber-500/50 focus:ring-amber-500/15",
                )}
              />
            </div>

            <div className="relative">
              <Building2
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              Type at least {MIN_SEARCH_LEN} characters to search.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Open positions</h2>
          <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums">
            {filtered.length}
          </span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card/60 px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-muted/50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-gradient-to-b from-card/60 to-card/30 px-6 py-16 text-center">
          <p className="text-base font-semibold">No roles match your filters</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Try another keyword, department, or employment type — or clear filters to see
            everything.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-gold transition hover:bg-primary/90"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Show all roles
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-4" role="list">
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
