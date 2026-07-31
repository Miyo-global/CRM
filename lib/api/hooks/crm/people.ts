"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  CrmPersonProfile,
  CrmOrganization,
  CrmOrganizationFilters,
  PaginatedCrmOrganizations,
  CreateCrmOrganizationInput,
  OrgHierarchyNode,
  OrgRollup,
  OrgTimelineEvent,
  RelatedLead,
} from "@/types/crm";

export function useCrmOrganizations(filters?: CrmOrganizationFilters) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.list(filters as Record<string, unknown>),
    queryFn: () =>
      apiClient.get<PaginatedCrmOrganizations>(
        "/crm/organizations",
        filters as Record<string, unknown>
      ),
  });
}

export function useCrmOrganizationDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.detail(id),
    queryFn: () => apiClient.get<CrmOrganization>(`/crm/organizations/${id}`),
    enabled: id > 0,
  });
}

export function useCreateCrmOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCrmOrganizationInput) =>
      apiClient.post<CrmOrganization>("/crm/organizations", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
    },
  });
}

export function useUpdateCrmOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateCrmOrganizationInput> & { id: number; parentId?: number | null; notes?: string | null; healthScore?: number | null }) =>
      apiClient.patch<CrmOrganization>(`/crm/organizations/${id}`, input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.detail(variables.id) });
    },
  });
}

export function useDeleteCrmOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ success: boolean }>(`/crm/organizations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.crmOrganizations.all });
    },
  });
}

export function useCrmOrgHierarchy(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.hierarchy(id),
    queryFn: () => apiClient.get<OrgHierarchyNode>(`/crm/organizations/${id}/hierarchy`),
    enabled: id > 0,
  });
}

export function useCrmOrgRollup(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.rollup(id),
    queryFn: () => apiClient.get<OrgRollup>(`/crm/organizations/${id}/roll-up`),
    enabled: id > 0,
  });
}

export function useCrmOrgTimeline(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.timeline(id),
    queryFn: () => apiClient.get<OrgTimelineEvent[]>(`/crm/organizations/${id}/timeline`),
    enabled: id > 0,
  });
}

export function useCrmOrgRelatedLeads(id: number) {
  return useQuery({
    queryKey: queryKeys.crmOrganizations.relatedLeads(id),
    queryFn: () => apiClient.get<RelatedLead[]>(`/crm/organizations/${id}/related-leads`),
    enabled: id > 0,
  });
}

export function useCrmPeopleSlugs() {
  return useQuery({
    queryKey: queryKeys.crm.peopleSlugs(),
    queryFn: () => apiClient.get<Record<string, string>>("/crm/people-slugs"),
  });
}

export function useCrmPerson(slug: string) {
  return useQuery({
    queryKey: queryKeys.crm.person(slug),
    queryFn: () => apiClient.get<CrmPersonProfile | null>(`/crm/people/${slug}`),
    enabled: !!slug,
  });
}
