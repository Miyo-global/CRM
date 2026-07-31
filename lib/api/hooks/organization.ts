"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { OrgSettings, OrgMember, Invitation, JobOfficeLocation } from "@/types/organization";

interface MembersResponse {
  data: OrgMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const useOrgSettings = (
  options?: Omit<UseQueryOptions<OrgSettings, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<OrgSettings, Error>({
    queryKey: queryKeys.organization.settings(),
    queryFn: () => apiClient.get<OrgSettings>("/organization/settings"),
    ...options,
  });
};

type OrgMembersQueryOptions = Omit<
  UseQueryOptions<MembersResponse, Error>,
  "queryKey" | "queryFn"
> & {
  /** Filter members by organization role (e.g. CEO, HR). Passed as comma-separated query param. */
  roles?: string[];
};

export const useOrgMembers = (
  page = 1,
  limit = 20,
  search?: string,
  options?: OrgMembersQueryOptions
) => {
  const { roles, ...queryOptions } = options ?? {};
  const rolesKey = roles?.length ? [...roles].sort().join("|") : "";
  return useQuery<MembersResponse, Error>({
    queryKey: [...queryKeys.organization.members(), page, limit, search ?? "", rolesKey],
    queryFn: () =>
      apiClient.get<MembersResponse>("/organization/members", {
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(roles?.length ? { roles: roles.join(",") } : {}),
      }),
    ...queryOptions,
  });
};

export const useInvitations = (
  options?: Omit<
    UseQueryOptions<Invitation[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<Invitation[], Error>({
    queryKey: queryKeys.organization.invitations(),
    queryFn: () => apiClient.get<Invitation[]>("/organization/invitations"),
    ...options,
  });
};

export const useUserProfile = (
  options?: Omit<UseQueryOptions<Record<string, unknown>, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<Record<string, unknown>, Error>({
    queryKey: [...queryKeys.organization.all, "profile"],
    queryFn: () => apiClient.get<Record<string, unknown>>("/organization/profile"),
    ...options,
  });
};

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; invitationId: string },
    Error,
    { email: string; role: string }
  >({
    mutationFn: (data) =>
      apiClient.post<{ success: boolean; invitationId: string }>(
        "/organization/members",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.invitations(),
      });
    },
  });
};

export const useCancelInvitation = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, { invitationId: string }>({
    mutationFn: (data) =>
      apiClient.delete<{ success: boolean }>("/organization/invitations", {
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.invitations(),
      });
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { userId: string; role: string }
  >({
    mutationFn: ({ userId, role }) =>
      apiClient.patch<{ success: boolean }>(
        `/organization/members/${userId}`,
        { role }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(),
      });
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (userId) =>
      apiClient.delete<{ success: boolean }>(
        `/organization/members/${userId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(),
      });
    },
  });
};

export const useUpdateOrgSettings = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    {
      name?: string;
      slug?: string;
      logo?: string | null;
      timezone?: string;
      currency?: string;
      fiscalYearStart?: number;
      directoryPublic?: boolean;
      primaryColor?: string | null;
      loginBgUrl?: string | null;
      ipAllowlist?: string[];
      jobOfficeLocations?: JobOfficeLocation[];
    }
  >({
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>("/organization/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.settings(),
      });
    },
  });
};

export const useUpdateOrgSecuritySettings = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { mfaEnforced?: boolean; passwordExpiryDays?: number | null; allowedEmailDomains?: string[] }
  >({
    mutationFn: (data) =>
      apiClient.patch<{ success: boolean }>("/organization/security", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.settings(),
      });
    },
  });
};
