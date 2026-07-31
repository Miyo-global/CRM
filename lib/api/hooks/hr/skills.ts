"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface EmployeeSkill {
  id: number;
  userId: string;
  skillName: string;
  level: number | null;
  verifiedBy: string | null;
  verifiedAt: Date | string | null;
  certifiedAt: Date | string | null;
  validUntil: string | null;
  user?: { id: string; name: string | null } | null;
}

const skillKeys = { all: [...queryKeys.hr.all, "skills"] as const, list: (p?: Record<string, unknown>) => [...skillKeys.all, "list", p] as const };

export function useEmployeeSkills(params?: { userId?: string }) {
  return useQuery({ queryKey: skillKeys.list(params as Record<string, unknown>), queryFn: () => apiClient.get<EmployeeSkill[]>("/hr/skills", params as Record<string, unknown>) });
}

export function useAddSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      skillName: string;
      level?: number;
      userId?: string;
      certifiedAt?: string | null;
      validUntil?: string | null;
    }) => apiClient.post<EmployeeSkill>("/hr/skills", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.all }),
  });
}

export function useVerifySkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { skillId: number; verified: boolean }) =>
      apiClient.post<EmployeeSkill>("/hr/employees/skills-matrix/verify", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.all }),
  });
}

export function useDeleteSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId }: { skillId: number }) =>
      apiClient.delete<{ success: boolean }>(`/hr/skills/${skillId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.all }),
  });
}

export function useUpdateSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      skillId,
      ...patch
    }: {
      skillId: number;
      level?: number;
      certifiedAt?: string | null;
      validUntil?: string | null;
    }) => apiClient.patch<EmployeeSkill>(`/hr/skills/${skillId}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: skillKeys.all }),
  });
}


export interface RoleSkillGap {
  jobId: number;
  title: string;
  status: string;
  required: { skill: string; covered: boolean }[];
  missingCount: number;
  coveredCount: number;
}

export interface SkillCertInfo {
  certified: boolean;
  validUntil: string | null;
}

export interface SkillsMatrixData {
  employees: {
    userId: string;
    name: string | null;
    image: string | null;
    skills: Record<string, number>;
    certs?: Record<string, SkillCertInfo>;
  }[];
  skills: string[];
  roleGaps: RoleSkillGap[];
}

export function useSkillsMatrix() {
  return useQuery({
    queryKey: [...skillKeys.all, "matrix"] as const,
    queryFn: () => apiClient.get<SkillsMatrixData>("/hr/employees/skills-matrix"),
    staleTime: 60_000,
  });
}


export interface AnniversaryFeedItem {
  userId: string;
  name: string | null;
  image: string | null;
  type: "BIRTHDAY" | "WORK_ANNIVERSARY";
  daysAway: number;
  dateStr: string;
  yearsCount?: number;
}

export function useAnniversaryFeed() {
  return useQuery({
    queryKey: [...queryKeys.hr.all, "anniversary-feed"] as const,
    queryFn: () => apiClient.get<AnniversaryFeedItem[]>("/hr/employees/anniversary-feed"),
    staleTime: 60 * 60_000,
  });
}
