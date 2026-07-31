import { z } from "zod";
export const paginationInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export const optionalPaginationInputSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;
export type OptionalPaginationInput = z.infer<typeof optionalPaginationInputSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE as DEFAULT_LIMIT,
  MAX_PAGE_SIZE as MAX_LIMIT,
  PAGE_SIZE_OPTIONS,
  clampPageSize,
  parsePageParam,
  parsePageSizeParam,
  parsePaginationFromSearchParams,
} from "@/lib/pagination-constants";
