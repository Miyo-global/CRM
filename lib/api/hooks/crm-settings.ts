"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface AssignmentRuleCondition {
  field: string;
  operator: string;
  value: string;
}

export interface AssignmentRule {
  id: number;
  orgId: string;
  name: string;
  assignmentType: "assign_user" | "round_robin";
  assignToUserId: string | null;
  roundRobinUserIds: string[] | null;
  conditions: AssignmentRuleCondition[];
  priority: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateAssignmentRuleInput {
  name: string;
  assignmentType: "assign_user" | "round_robin";
  assignToUserId?: string;
  roundRobinUserIds?: string[];
  conditions: AssignmentRuleCondition[];
  priority?: number;
}

export interface UpdateAssignmentRuleInput {
  id: number;
  name?: string;
  assignmentType?: "assign_user" | "round_robin";
  assignToUserId?: string;
  roundRobinUserIds?: string[];
  conditions?: AssignmentRuleCondition[];
  priority?: number;
  isActive?: boolean;
}

export interface ReorderAssignmentRulesInput {
  rules: { id: number; priority: number }[];
}

export function useAssignmentRules() {
  return useQuery({
    queryKey: queryKeys.crmSettings.assignmentRules(),
    queryFn: () => apiClient.get<AssignmentRule[]>("/crm/assignment-rules"),
  });
}

export function useCreateAssignmentRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssignmentRuleInput) =>
      apiClient.post<AssignmentRule>("/crm/assignment-rules", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.assignmentRules() });
    },
  });
}

export function useUpdateAssignmentRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateAssignmentRuleInput) =>
      apiClient.patch<AssignmentRule>(`/crm/assignment-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.assignmentRules() });
    },
  });
}

export function useDeleteAssignmentRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/assignment-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.assignmentRules() });
    },
  });
}

export function useReorderAssignmentRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderAssignmentRulesInput) =>
      apiClient.patch<{ success: boolean }>("/crm/assignment-rules/reorder", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.assignmentRules() });
    },
  });
}

export interface EmailTemplate {
  id: number;
  orgId: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateEmailTemplateInput {
  name: string;
  subject: string;
  body: string;
}

export interface UpdateEmailTemplateInput {
  id: number;
  name?: string;
  subject?: string;
  body?: string;
}

export function useEmailTemplates(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: queryKeys.crmSettings.emailTemplates(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<EmailTemplate[]>("/crm/email-templates", params as Record<string, unknown>),
  });
}

export function useCreateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmailTemplateInput) =>
      apiClient.post<EmailTemplate>("/crm/email-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.all });
    },
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateEmailTemplateInput) =>
      apiClient.patch<EmailTemplate>(`/crm/email-templates/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.all });
    },
  });
}

export function useDeleteEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/email-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.all });
    },
  });
}

export interface ScoringRule {
  id: number;
  orgId: string;
  field: string;
  operator: string;
  value: string;
  points: number;
  createdAt: string | null;
}

export interface CreateScoringRuleInput {
  field: string;
  operator: string;
  value: string;
  points: number;
}

export interface UpdateScoringRuleInput {
  id: number;
  field?: string;
  operator?: string;
  value?: string;
  points?: number;
}

export function useScoringRules() {
  return useQuery({
    queryKey: queryKeys.crmSettings.scoringRules(),
    queryFn: () => apiClient.get<ScoringRule[]>("/crm/scoring-rules"),
  });
}

export function useCreateScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScoringRuleInput) =>
      apiClient.post<ScoringRule>("/crm/scoring-rules", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.scoringRules() });
    },
  });
}

export function useUpdateScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateScoringRuleInput) =>
      apiClient.patch<ScoringRule>(`/crm/scoring-rules/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.scoringRules() });
    },
  });
}

export function useDeleteScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/scoring-rules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.scoringRules() });
    },
  });
}

export interface SlaPolicy {
  id: number;
  orgId: string;
  name: string;
  appliesTo: "lead" | "deal" | "both";
  priority: "low" | "medium" | "high" | "urgent";
  firstResponseHours: number;
  resolutionHours: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SlaReport {
  total: number;
  compliant: number;
  breached: number;
  complianceRate: number;
}

export interface SlaBreachedLead {
  id: number;
  name: string;
  status: string;
  slaDeadline: string | null;
}

export interface CreateSlaPolicyInput {
  name: string;
  appliesTo: "lead" | "deal" | "both";
  priority: "low" | "medium" | "high" | "urgent";
  firstResponseHours: number;
  resolutionHours: number;
}

export interface UpdateSlaPolicyInput {
  id: number;
  name?: string;
  appliesTo?: "lead" | "deal" | "both";
  priority?: "low" | "medium" | "high" | "urgent";
  firstResponseHours?: number;
  resolutionHours?: number;
}

export function useSlaPolicies() {
  return useQuery({
    queryKey: queryKeys.crmSettings.slaPolicies(),
    queryFn: () => apiClient.get<SlaPolicy[]>("/crm/sla/policies"),
  });
}

export function useSlaReport() {
  return useQuery({
    queryKey: queryKeys.crmSettings.slaReport(),
    queryFn: () => apiClient.get<SlaReport>("/crm/sla/report"),
  });
}

export function useSlaBreachedLeads(params?: { limit?: number }) {
  return useQuery({
    queryKey: queryKeys.crmSettings.slaBreachedLeads(params as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<SlaBreachedLead[]>("/crm/sla/breached", params as Record<string, unknown>),
  });
}

export function useCreateSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSlaPolicyInput) =>
      apiClient.post<SlaPolicy>("/crm/sla/policies", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.slaPolicies() });
    },
  });
}

export function useUpdateSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateSlaPolicyInput) =>
      apiClient.patch<SlaPolicy>(`/crm/sla/policies/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.slaPolicies() });
    },
  });
}

export function useDeleteSlaPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/sla/policies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmSettings.slaPolicies() });
    },
  });
}
