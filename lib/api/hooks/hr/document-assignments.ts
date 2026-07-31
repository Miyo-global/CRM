"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface DocumentAssignment {
  id: number;
  userId: string;
  assignedById: string | null;
  createdAt: string | null;
  name: string | null;
  email: string;
  image: string | null;
}

export type DocumentAssignmentCounts = Record<number, number>;

const documentAssignmentKeys = {
  all: [...queryKeys.hr.all, "documentAssignments"] as const,
  list: (documentId: number) =>
    [...documentAssignmentKeys.all, "list", documentId] as const,
  counts: () => [...documentAssignmentKeys.all, "counts"] as const,
};

export function useDocumentAssignments(documentId: number | null) {
  return useQuery({
    queryKey: documentAssignmentKeys.list(documentId ?? 0),
    queryFn: () =>
      apiClient.get<DocumentAssignment[]>(
        `/hr/documents/${documentId}/assignments`,
      ),
    enabled: !!documentId,
  });
}

export function useDocumentAssignmentCounts() {
  return useQuery({
    queryKey: documentAssignmentKeys.counts(),
    queryFn: () =>
      apiClient.get<DocumentAssignmentCounts>("/hr/documents/assignments/counts"),
    staleTime: 30_000,
  });
}

export function useSetDocumentAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      userIds,
    }: {
      documentId: number;
      userIds: string[];
    }) =>
      apiClient.post<{ success: boolean; assigned: number }>(
        `/hr/documents/${documentId}/assignments`,
        { userIds },
      ),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({
        queryKey: documentAssignmentKeys.list(vars.documentId),
      });
      qc.invalidateQueries({ queryKey: documentAssignmentKeys.counts() });
    },
  });
}

export function useRemoveDocumentAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      userIds,
    }: {
      documentId: number;
      userIds: string[];
    }) =>
      apiClient.delete<{ success: boolean }>(
        `/hr/documents/${documentId}/assignments`,
        { params: { userIds: userIds.join(",") } },
      ),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({
        queryKey: documentAssignmentKeys.list(vars.documentId),
      });
      qc.invalidateQueries({ queryKey: documentAssignmentKeys.counts() });
    },
  });
}
