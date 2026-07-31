"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface SurveyQuestion { id: string; text: string; type: "rating" | "text" | "choice"; options?: string[] }
export interface SurveyResponse { id: number; surveyId: number; answers: { questionId: string; value: string | number }[] | null; submittedAt: Date | string | null }

export interface PulseSurvey {
  id: number;
  title: string;
  questions: SurveyQuestion[] | null;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | null;
  isAnonymous: boolean | null;
  closesAt: Date | string | null;
  createdAt: Date | string | null;
  responses?: SurveyResponse[];
}

const surveyKeys = { all: [...queryKeys.hr.all, "surveys"] as const, list: () => [...surveyKeys.all, "list"] as const };

export function usePulseSurveys() {
  return useQuery({ queryKey: surveyKeys.list(), queryFn: () => apiClient.get<PulseSurvey[]>("/hr/surveys") });
}

export function useCreateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; questions: SurveyQuestion[]; isAnonymous?: boolean; closesAt?: string }) =>
      apiClient.post<PulseSurvey>("/hr/surveys", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.list() }),
  });
}

export function useUpdateSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: string; title?: string }) =>
      apiClient.patch<{ success: boolean }>(`/hr/surveys/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.list() }),
  });
}

export function useSubmitSurveyResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { surveyId: number; answers: { questionId: string; value: string | number }[] }) =>
      apiClient.post<SurveyResponse>("/hr/surveys", data, { headers: { "x-action": "respond" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: surveyKeys.list() }),
  });
}
