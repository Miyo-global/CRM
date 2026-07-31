import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useMfaStatus() {
  return useQuery({
    queryKey: ["mfa", "status"],
    queryFn: () => apiClient.get<{ enabled: boolean }>("/auth/mfa/status"),
  });
}

export function useMfaSetup() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{
        qrDataUrl: string;
        secret: string;
        manualEntryKey: string;
        backupCodes: string[];
      }>("/auth/mfa/setup"),
  });
}

export function useMfaVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { token: string } | { backupCode: string }) =>
      apiClient.post<{ enabled: boolean }>("/auth/mfa/verify", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa"] }),
  });
}

export function useMfaDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<{ disabled: boolean }>("/auth/mfa/disable", { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa"] }),
  });
}

export function useResetMfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string }) =>
      apiClient.post<{ reset: boolean }>("/auth/mfa/reset", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.organization.members() });
    },
  });
}

export function useResendInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { invitationId: string }) =>
      apiClient.post<{ success: boolean }>("/organization/invitations/resend", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.organization.invitations() });
    },
  });
}
