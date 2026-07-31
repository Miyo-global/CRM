"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface CelebrationUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  dateOfBirth: string | null;
  joiningDate: string | null;
}

export interface CelebrationsData {
  todayBirthdays: CelebrationUser[];
  upcomingBirthdays: CelebrationUser[];
  todayAnniversaries: (CelebrationUser & { years: number })[];
}

export function useCelebrations() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "celebrations"] as const,
    queryFn: () => apiClient.get<CelebrationsData>("/hr/celebrations"),
    staleTime: 300_000,
  });
}

export function useGenerateExperienceLetter() {
  return useMutation({
    mutationFn: (data: { userId: string; relievingDate: string }) =>
      apiClient.post<{ documentId: number; title: string }>("/hr/exit/experience-letter", data),
  });
}
