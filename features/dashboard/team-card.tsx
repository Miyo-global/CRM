"use client";

import { memo, useMemo, useState } from "react";
import { Clock, LogOut, Search, Users } from "lucide-react";
import { WidgetCard, WidgetListRow } from "@/components/dashboard/widgets/widget-card";
import { StatusPill } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials, formatTime } from "@/lib/format-utils";
import { getColorSafe, onlineStatusColors } from "@/lib/theme-constants";

const MAX_ROWS = 6;

interface TeamMember {
  userId: string;
  name: string;
  image: string | null;
  isOnline: boolean | null;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
}

interface TeamCardProps {
  members: TeamMember[] | undefined;
  isLoading: boolean;
}

export const TeamCard = memo(function TeamCard({ members, isLoading }: TeamCardProps) {
  const [query, setQuery] = useState("");
  const showSearch = (members?.length ?? 0) > 5;
  const filtered = useMemo(() => {
    if (!members) return [];
    const q = query.trim().toLowerCase();
    return q ? members.filter((m) => m.name.toLowerCase().includes(q)) : members;
  }, [members, query]);

  return (
    <WidgetCard
      title="Team Availability"
      icon={Users}
      tone="success"
      count={members?.length || undefined}
      viewAllHref={filtered.length > MAX_ROWS ? "/hr/attendance" : undefined}
    >
      <div className="flex flex-col" aria-live="polite">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-md" />
            ))}
          </div>
        ) : members && members.length > 0 ? (
          <>
            {showSearch && (
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search team…"
                  className="h-8 pl-8 text-sm"
                  aria-label="Search team members"
                />
              </div>
            )}
            {filtered.length > 0 ? (
              <ul className="-mx-2">
                {filtered.slice(0, MAX_ROWS).map((member) => (
                  <li key={member.userId}>
                    <WidgetListRow
                      leading={
                        <span className="relative">
                          <Avatar className="size-8">
                            <AvatarImage src={resolveImageUrl(member.image)} />
                            <AvatarFallback className="text-2xs">{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card ${getColorSafe(onlineStatusColors, member.isOnline ? "online" : "offline")}`} aria-hidden="true" />
                        </span>
                      }
                      title={member.name}
                      meta={
                        member.isOnline ? (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <Clock className="size-3" aria-hidden="true" />
                            Checked in at {formatTime(member.checkIn)}
                          </span>
                        ) : member.checkOut ? (
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <LogOut className="size-3" aria-hidden="true" />
                            Checked out at {formatTime(member.checkOut)}
                          </span>
                        ) : (
                          "Offline"
                        )
                      }
                      trailing={
                        <StatusPill tone={member.isOnline ? "success" : "neutral"}>
                          {member.isOnline ? "Online" : "Offline"}
                        </StatusPill>
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={Search}
                title="No results for this search"
                description={`No members match \u201c${query}\u201d.`}
                action={{ label: "Clear search", onClick: () => setQuery("") }}
              />
            )}
          </>
        ) : (
          <EmptyState
            compact
            title="No team members online"
            description="Team availability will appear here when members clock in."
          />
        )}
      </div>
    </WidgetCard>
  );
});
