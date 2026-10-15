"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type ActivityItem = {
  id: number;
  ticketId: number;
  action: string;
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
  ticketTitle: string;
  ticketNumber: number;
  actor: { id: string; name: string | null; firstName: string | null; lastName: string | null; image: string | null } | null;
};

type ActivityPage = { data: ActivityItem[]; nextCursor: number | null };

function useActivityPages(queryKey: readonly unknown[], url: string, enabled: boolean) {
  return useInfiniteQuery<ActivityPage>({
    queryKey,
    queryFn: ({ pageParam }) =>
      apiClient.get<ActivityPage>(url, { limit: 30, cursor: pageParam ?? undefined }),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });
}

export function useTicketActivity(projectId: number, ticketId: number) {
  return useActivityPages(
    queryKeys.projects.ticketActivity(ticketId),
    `/projects/${projectId}/tickets/${ticketId}/activity`,
    projectId > 0 && ticketId > 0,
  );
}

export function useProjectActivity(projectId: number) {
  return useActivityPages(queryKeys.projects.activity(projectId), `/projects/${projectId}/activity`, projectId > 0);
}

type AttentionTicket = { id: number; title: string; ticketNumber: number; status: string; dueDate: string | null; priority: string | null };

export type ProjectOverview = {
  counts: { total: number; open: number; inProgress: number; overdue: number; doneThisWeek: number };
  health: { status: "on_track" | "at_risk" | "off_track"; donePct: number };
  projectKey: string | null;
  attention: { overdue: AttentionTicket[]; unassignedUrgent: AttentionTicket[]; stale: AttentionTicket[] };
};

export function useProjectOverview(projectId: number) {
  return useQuery<ProjectOverview>({
    queryKey: [...queryKeys.projects.all, "overview", projectId],
    queryFn: () => apiClient.get<ProjectOverview>(`/projects/${projectId}/overview`),
    enabled: projectId > 0,
  });
}
