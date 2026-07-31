import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { BonusRow } from "@/lib/hr/bonus-filters";

export function useHrMyBonuses() {
  return useQuery({
    queryKey: queryKeys.hr.myBonuses(),
    queryFn: () => apiClient.get<BonusRow[]>("/hr/bonuses", { mine: true }),
  });
}
