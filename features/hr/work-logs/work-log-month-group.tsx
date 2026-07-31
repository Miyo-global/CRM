"use client";

import { format, isWeekend } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { WorkLogEntryRow } from "./work-log-entry-row";

interface WorkLog {
  id: number;
  date: string;
  description?: string | null;
  workLink?: string | null;
  status?: string | null;
  ticket?: {
    id: number;
    title: string;
    ticketNumber: number;
    project?: { id: number; name: string; key: string } | null;
  } | null;
}

interface WorkLogMonthGroupProps {
  monthKey: string;
  label: string;
  allDays: Date[];
  displayDays: Date[];
  isCollapsed: boolean;
  onToggle: (monthKey: string) => void;
  filled: number;
  searchTerm: string;
  logs: WorkLog[] | undefined;
  selectedUserId: string | undefined;
  currentUserId: string | undefined;
  isAdminOrCeo: boolean;
  onSave: (date: string, content: string, workLink: string) => Promise<unknown> | void;
  isSaving: boolean;
}

export function WorkLogMonthGroup({
  monthKey,
  label,
  allDays,
  displayDays,
  isCollapsed,
  onToggle,
  filled,
  searchTerm,
  logs,
  selectedUserId,
  currentUserId,
  isAdminOrCeo,
  onSave,
  isSaving,
}: WorkLogMonthGroupProps) {
  const weekdays = allDays.filter((d) => !isWeekend(d)).length;
  const regionId = `month-content-${monthKey}`;
  const isViewingOther = !!selectedUserId && selectedUserId !== currentUserId;
  const isReadOnly = isViewingOther;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => onToggle(monthKey)}
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-controls={regionId}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(monthKey);
          }
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            )}
            <CardTitle className="text-base sm:text-lg truncate">{label}</CardTitle>
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap shrink-0">
            {searchTerm.trim()
              ? `${displayDays.length} match${displayDays.length !== 1 ? "es" : ""}`
              : `${filled}/${weekdays} logged`}
          </span>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent id={regionId} role="region" aria-label={`Work logs for ${label}`} className="px-3 sm:px-6">
          <div className="space-y-2 sm:space-y-4">
            {displayDays.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const log = logs?.find((l) => l.date === dateStr);
              return (
                <WorkLogEntryRow
                  key={dateStr}
                  date={date}
                  initialContent={log?.description ?? ""}
                  initialWorkLink={log?.workLink ?? ""}
                  ticket={log?.ticket}
                  onSave={(content, workLink) => onSave(dateStr, content, workLink)}
                  isSaving={isSaving}
                  searchTerm={searchTerm}
                  readOnly={isReadOnly}
                  status={log?.status ?? undefined}
                />
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
