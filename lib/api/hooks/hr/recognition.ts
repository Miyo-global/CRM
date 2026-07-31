"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Recognition {
  id: number;
  orgId: string;
  fromUserId: string;
  toUserId: string;
  message: string;
  category: string | null;
  isPublic: boolean | null;
  createdAt: Date | string | null;
  fromUser?: { id: string; name: string | null; image: string | null; email: string | null } | null;
  toUser?: { id: string; name: string | null; image: string | null; email: string | null } | null;
  fromUserDept?: string | null;
  toUserDept?: string | null;
}

const recognitionKeys = {
  all: [...queryKeys.hr.all, "recognition"] as const,
  list: () => [...recognitionKeys.all, "list"] as const,
};

export function useRecognitions() {
  return useQuery({
    queryKey: recognitionKeys.list(),
    queryFn: () => apiClient.get<Recognition[]>("/hr/recognition"),
  });
}

export function useCreateRecognition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { toUserId: string; message: string; category?: string }) =>
      apiClient.post<Recognition>("/hr/recognition", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recognitionKeys.list() }),
  });
}
