"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Candidate } from "@/types/hr";
import type { buildCandidatePayload } from "@/features/hr/recruitment/candidates-list/candidate-payload";

export type CandidatePayload = ReturnType<typeof buildCandidatePayload>;

const ATS_KANBAN_KEY = ["miyoglobal", "hr", "atsKanban"] as const;

export function useCreateCandidateFull() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CandidatePayload) =>
      apiClient.post<Candidate>("/hr/recruitment/candidates", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentPipeline() });
      qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}

export function useUpdateCandidateFull() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: CandidatePayload & { id: number }) =>
      apiClient.patch<{ success: boolean }>(
        `/hr/recruitment/candidates/${id}`,
        data,
      ),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidates() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.candidate(id) });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentPipeline() });
      qc.invalidateQueries({ queryKey: queryKeys.hr.recruitmentStats() });
      qc.invalidateQueries({ queryKey: ATS_KANBAN_KEY });
    },
  });
}
