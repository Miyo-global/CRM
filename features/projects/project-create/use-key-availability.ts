"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useDebouncedValue } from "@/hooks/use-expense-filters";

type KeyCheck = { key?: string; valid?: boolean; available?: boolean; message?: string; suggestion?: string | null };

export function useKeyAvailability(key: string) {
  const debounced = useDebouncedValue(key.trim().toUpperCase(), 300);
  return useQuery<KeyCheck>({
    queryKey: [...queryKeys.projects.all, "keyAvailable", debounced],
    queryFn: () => apiClient.get<KeyCheck>("/projects/key-available", { key: debounced }),
    enabled: /^[A-Z][A-Z0-9]{1,9}$/.test(debounced),
    staleTime: 30_000,
  });
}

export async function suggestKey(name: string): Promise<string | null> {
  const res = await apiClient.get<KeyCheck>("/projects/key-available", { name });
  return res.suggestion ?? null;
}
