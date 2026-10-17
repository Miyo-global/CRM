"use client";

import { useCallback, useTransition, Fragment } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketPriority, TicketType } from "@/types/projects";

/** Select trigger styled as a filter pill (matches FilterChip); gold-soft when a value is applied. */
const pillTrigger = (active: boolean) =>
  cn(
    "w-auto shrink-0 gap-1 rounded-full data-[size=default]:h-7 px-3 text-xs font-medium shadow-none",
    active
      ? "border-gold-300 bg-brand-soft text-brand-soft-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-foreground"
  );

const DEFAULT_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const TYPES: TicketType[] = ["TASK", "BUG", "STORY", "EPIC", "SUBTASK"];

interface TicketFilterBarProps {
  sprints?: { id: number; name: string }[];
  members?: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
  }[];
  showTypeFilter?: boolean;
  showSprintFilter?: boolean;
  showAssigneeFilter?: boolean;
  /** The project's own columns (project_statuses names), so filters match the board (MIYO-0070). */
  statuses?: string[];
  className?: string;
}

export function TicketFilterBar({
  sprints,
  members,
  showTypeFilter = true,
  showSprintFilter = true,
  showAssigneeFilter = true,
  statuses,
}: TicketFilterBarProps) {
  const statusOptions = statuses && statuses.length > 0 ? statuses : DEFAULT_STATUSES;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const type = searchParams.get("type") ?? "";
  const sprintId = searchParams.get("sprintId") ?? "";
  const assigneeId = searchParams.get("assigneeId") ?? "";

  const hasFilters = !!(q || status || priority || type || sprintId || assigneeId);

  const setParam = useCallback(
    (key: string, value: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
        params.delete("page");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    startTransition(() => {

      const params = new URLSearchParams(searchParams.toString());
      ["q", "status", "priority", "type", "sprintId", "assigneeId", "page"].forEach((k) =>
        params.delete(k)
      );
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  return (
    <Fragment>

      <div className="relative w-full min-w-40 sm:w-56 sm:flex-none">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          data-page-search
          placeholder="Search..."
          value={q}
          onChange={(e) => setParam("q", e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>

      <Select
        value={status || "ALL"}
        onValueChange={(v) => setParam("status", v === "ALL" ? "" : v)}
      >
        <SelectTrigger className={pillTrigger(!!status)}>
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          {statusOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={priority || "ALL"}
        onValueChange={(v) => setParam("priority", v === "ALL" ? "" : v)}
      >
        <SelectTrigger className={pillTrigger(!!priority)}>
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Priority</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showTypeFilter && (
        <Select
          value={type || "ALL"}
          onValueChange={(v) => setParam("type", v === "ALL" ? "" : v)}
        >
          <SelectTrigger className={pillTrigger(!!type)}>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Type</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showSprintFilter && sprints && sprints.length > 0 && (
        <Select
          value={sprintId || "ALL"}
          onValueChange={(v) => setParam("sprintId", v === "ALL" ? "" : v)}
        >
          <SelectTrigger className={pillTrigger(!!sprintId)}>
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sprints</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showAssigneeFilter && members && members.length > 0 && (
        <Select
          value={assigneeId || "ALL"}
          onValueChange={(v) => setParam("assigneeId", v === "ALL" ? "" : v)}
        >
          <SelectTrigger className={pillTrigger(!!assigneeId)}>
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Assignees</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.firstName ?? m.name ?? m.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
        >
          <X aria-hidden="true" className="size-3" />
          Clear
        </Button>
      )}
    </Fragment>
  );
}
