"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTeamIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ArrowLeft } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import Link from "next/link";
import type { TeamDetail } from "@/app/api/hr/teams/[teamId]/route";

function useTeamDetail(teamId: string) {
  return useQuery({
    queryKey: ["hr", "teams", teamId] as const,
    queryFn: () => apiClient.get<TeamDetail>(`/hr/teams/${teamId}`),
    enabled: !!teamId,
  });
}

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const { data: team, isLoading } = useTeamDetail(teamId);

  return (
    <PageWrapper
      title={isLoading ? "Team" : (team?.name ?? "Team")}
      subtitle={
        team?.managerName
          ? `Manager: ${team.managerName} · ${team.members.length} member${team.members.length !== 1 ? "s" : ""}`
          : team
            ? `${team.members.length} member${team.members.length !== 1 ? "s" : ""}`
            : ""
      }
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr/employees">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Directory
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !team || team.members.length === 0 ? (
        <EmptyState
          illustration={<EmptyTeamIllustration className="h-40 w-40" />}
          title="No team members"
          description="No active employees assigned to this department."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {team.members.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Link
                  href={`/hr/employees/${member.id}`}
                  className="flex items-center gap-3 group"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={resolveImageUrl(member.image)} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {(member.name ?? "?")[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                      {member.name ?? member.email}
                    </p>
                    {member.designation && (
                      <p className="text-xs text-muted-foreground truncate">{member.designation}</p>
                    )}
                    <Badge variant="outline" className="text-[10px] mt-0.5">
                      {member.role}
                    </Badge>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
