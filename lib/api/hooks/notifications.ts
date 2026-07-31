"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Notification, UnreadCount } from "@/types/notifications";

export const useNotifications = (
  unreadOnly = false,
  limit = 20,
  options?: Omit<
    UseQueryOptions<Notification[], Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<Notification[], Error>({
    queryKey: queryKeys.notifications.list(unreadOnly),
    queryFn: () =>
      apiClient.get<Notification[]>("/notifications", {
        unreadOnly: String(unreadOnly),
        limit: String(limit),
      }),
    ...options,
  });
};

export const useUnreadNotificationCount = (
  options?: Omit<UseQueryOptions<UnreadCount, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UnreadCount, Error>({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => apiClient.get<UnreadCount>("/notifications/unread-count"),
    refetchInterval: 60_000,
    staleTime: 30_000,
    ...options,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => apiClient.patch<{ success: boolean }>(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () =>
      apiClient.patch<{ success: boolean }>("/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) =>
      apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
};

export const useClearAllNotifications = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () =>
      apiClient.delete<{ success: boolean }>("/notifications/clear-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      });
    },
  });
};
