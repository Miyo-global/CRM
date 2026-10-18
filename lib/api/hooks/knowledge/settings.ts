"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { kbCapabilitiesSchema, kbSettingsSchema, type KbSettings } from "./schemas";

/**
 * KB-0066: what this deployment can actually do.
 *
 * Booleans only, never key names or values. The UI hides AI, uploads and email
 * features from this rather than from env vars it cannot see.
 */
export function useKbCapabilities() {
  return useQuery({
    queryKey: queryKeys.knowledge.capabilities(),
    queryFn: async () =>
      kbCapabilitiesSchema.parse(await apiClient.get("/knowledge/capabilities")),
    // Capabilities change when the deployment changes, not during a session.
    staleTime: 5 * 60_000,
  });
}

export function useKbSettings() {
  return useQuery({
    queryKey: queryKeys.knowledge.settings(),
    queryFn: async () => kbSettingsSchema.parse(await apiClient.get("/knowledge/settings")),
  });
}

export function useUpdateKbSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<KbSettings>) =>
      kbSettingsSchema.parse(await apiClient.patch("/knowledge/settings", input)),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.knowledge.settings(), settings);
    },
  });
}

export function useUpdateKbHrLinkFlags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      hrLinkEnabled?: boolean;
      hrLinkPolicies?: boolean;
      hrLinkHandbook?: boolean;
    }) => apiClient.patch("/knowledge/settings/hr-link-flags", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.settings() });
    },
  });
}
