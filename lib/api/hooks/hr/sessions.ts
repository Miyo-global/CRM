"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface UserSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

export const useSessions = () =>
  useQuery<UserSession[]>({
    queryKey: queryKeys.sessions.list(),
    queryFn: () => apiClient.get<UserSession[]>("/hr/sessions"),
  });

export const useRevokeSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => apiClient.delete(`/hr/sessions/${sessionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions.all }),
  });
};

export const useRevokeAllSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete("/hr/sessions"),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions.all }),
  });
};

export const useRevokeSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionIds: string[]) =>
      apiClient.post<{ revokedCount: number }>("/hr/sessions/revoke", { sessionIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.sessions.all }),
  });
};
