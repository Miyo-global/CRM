"use client";

import { useBirthdays, type BirthdayEntry } from "@/lib/api/hooks/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveImageUrl } from "@/lib/utils";

export function BirthdaysCard() {
  const { data, isLoading } = useBirthdays();
  const entries = data ?? [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex flex-row items-center gap-2 space-y-0">
        <Cake className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <CardTitle className="text-sm font-semibold">Birthdays &amp; Anniversaries</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
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
            className="border-0 bg-transparent"
          />
        ) : (
          <ul className="space-y-3">
            {entries.map((entry: BirthdayEntry) => (
              <li key={`${entry.type}-${entry.id}`} className="flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage
                    src={resolveImageUrl(entry.image)}
                    alt={entry.name ?? "Employee"}
                  />
                  <AvatarFallback className="text-xs">
                    {(entry.name ?? "?")[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{entry.name ?? ""}</p>
                    <span aria-label={entry.type === "birthday" ? "Birthday" : "Work Anniversary"}>
                      {entry.type === "birthday" ? "🎂" : "⭐"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.designation ?? ""}
                    {entry.type === "anniversary" && entry.yearsCompleted != null
                      ? ` · ${entry.yearsCompleted}y`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
