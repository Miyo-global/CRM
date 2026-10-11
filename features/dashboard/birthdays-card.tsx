"use client";

import { useBirthdays, type BirthdayEntry } from "@/lib/api/hooks/dashboard";
import { Award, Cake } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { resolveImageUrl } from "@/lib/utils";
import { toneText } from "@/lib/design/tones";

export function BirthdaysCard() {
  const { data, isLoading } = useBirthdays();
  const entries = data ?? [];

  return (
    <WidgetCard title="Birthdays & Anniversaries" icon={Cake} tone="plum" count={entries.length || undefined}>
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex h-11 items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          compact
          icon={Cake}
          title="No upcoming celebrations"
          description="Birthdays and anniversaries will appear here."
        />
      ) : (
        <ul className="-mx-2">
          {entries.slice(0, 6).map((entry: BirthdayEntry) => {
            const isBirthday = entry.type === "birthday";
            const TypeIcon = isBirthday ? Cake : Award;
            return (
              <li key={`${entry.type}-${entry.id}`}>
                <WidgetListRow
                  leading={
                    <Avatar className="size-8">
                      <AvatarImage src={resolveImageUrl(entry.image)} alt={entry.name ?? "Employee"} />
                      <AvatarFallback className="text-2xs">{(entry.name ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  }
                  title={entry.name ?? ""}
                  meta={
                    <>
                      {entry.designation ?? ""}
                      {entry.type === "anniversary" && entry.yearsCompleted != null ? ` · ${entry.yearsCompleted}y` : ""}
                    </>
                  }
                  trailing={
                    <TypeIcon
                      className={`size-4 ${isBirthday ? toneText.plum : toneText.brand}`}
                      aria-label={isBirthday ? "Birthday" : "Work Anniversary"}
                    />
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
