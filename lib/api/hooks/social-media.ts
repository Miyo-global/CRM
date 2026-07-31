"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  SocialMediaStats,
  SocialMediaLatest,
  SocialMediaPlatform,
} from "@/types/social-media";

export const useSocialMediaLatest = (
  options?: Omit<
    UseQueryOptions<SocialMediaLatest, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery<SocialMediaLatest, Error>({
    queryKey: queryKeys.socialMedia.latest(),
    queryFn: () => apiClient.get<SocialMediaLatest>("/social-media/latest"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

interface UpsertSocialMediaInput {
  platform: SocialMediaPlatform;
  date: string;
  postsPublished?: number;
  storiesReels?: number;
  followersTotal?: number;
  engagementRate?: string;
  impressions?: number;
  reach?: number;
  linkClicks?: number;
  profileVisits?: number;
}

export const useUpsertSocialMediaStats = () => {
  const queryClient = useQueryClient();
  return useMutation<SocialMediaStats, Error, UpsertSocialMediaInput>({
    mutationFn: (data) =>
      apiClient.post<SocialMediaStats>("/social-media", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.socialMedia.all });
    },
  });
};
