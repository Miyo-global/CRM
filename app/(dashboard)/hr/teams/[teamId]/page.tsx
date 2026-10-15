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
import { QueryErrorState } from "@/components/ui/query-error-state";

function useTeamDetail(teamId: string) {
  return useQuery({
    queryKey: ["hr", "teams", teamId] as const,
    queryFn: () => apiClient.get<TeamDetail>(`/hr/teams/${teamId}`),
    enabled: !!teamId,
  });
}

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const { data: team, isLoading, isError, error, refetch } = useTeamDetail(teamId);

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
          <Link href="/hr">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Directory
          </Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState title="Couldn't load this team" error={error} onRetry={() => refetch()} />
      ) : !team || team.members.length === 0 ? (
        <EmptyState
          illustration={<EmptyTeamIllustration />}
          title="No team members"
          description="No active employees assigned to this department."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {team.members.map((member) => (
            <Card key={member.id} interactive className="gap-0 py-0">
              <CardContent className="p-4">
                <Link
                  href={`/hr/employees/${member.id}`}
                  className="group flex items-center gap-3 rounded-md outline-none focus-visible:focus-ring"
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={resolveImageUrl(member.image)} alt="" />
                    <AvatarFallback className="bg-brand-soft text-brand-soft-foreground font-bold text-sm">
                      {(member.name ?? "?")[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium transition-colors group-hover:text-brand-text">
                      {member.name ?? member.email}
                    </p>
                    {member.designation && (
                      <p className="text-xs text-muted-foreground truncate">{member.designation}</p>
                    )}
                    <Badge variant="outline" className="mt-1">
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
