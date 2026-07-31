"use client";

import { memo, useMemo, useState } from "react";
import { Clock, LogOut, Search, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { resolveImageUrl } from "@/lib/utils";
import { getInitials, formatTime } from "@/lib/format-utils";
import { getColorSafe, onlineStatusColors } from "@/lib/theme-constants";

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
    <Card className="bg-card border-border shadow-noir flex flex-col h-full w-full">
      <CardHeader className="flex-shrink-0 px-4 py-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-gold" aria-hidden="true" />
          Team Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col px-4 pt-0 pb-4" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3 overflow-y-auto">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : members && members.length > 0 ? (
          <>
          {showSearch && (
            <div className="relative mb-3 flex-shrink-0">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
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
          <ScrollArea className="h-full pr-3">
          <div className="space-y-3">
            {filtered.map((member) => (
              <div key={member.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={resolveImageUrl(member.image)} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${getColorSafe(onlineStatusColors, member.isOnline ? "online" : "offline")}`} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {member.isOnline ? (
                        <>
                          <Clock className="h-3 w-3" />
                          Checked in at {formatTime(member.checkIn)}
                        </>
                      ) : member.checkOut ? (
                        <>
                          <LogOut className="h-3 w-3" />
                          Checked out at {formatTime(member.checkOut)}
                        </>
                      ) : (
                        "Offline"
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant={member.isOnline ? "default" : "secondary"} className={member.isOnline ? getColorSafe(onlineStatusColors, "online") : ""}>
                  {member.isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
            ))}
          </div>
          </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No members match &ldquo;{query}&rdquo;.
              </p>
            </div>
          )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              illustration={<EmptyTeamIllustration />}
              title="No team members online"
              description="Team availability will appear here when members clock in."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});
