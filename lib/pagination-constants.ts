export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: PageSizeOption = 25;

export const DEFAULT_PAGE = 1;

export const MAX_PAGE_SIZE = 100;

export const PAGE_PARAM = "page";

export const PAGE_SIZE_PARAM = "pageSize";

export const LEGACY_SIZE_PARAM = "size";

const PAGE_SIZES_NUM = PAGE_SIZE_OPTIONS as readonly number[];

export function clampPageSize(n: number): PageSizeOption {
  const v = Number.isFinite(n) ? Math.floor(n) : DEFAULT_PAGE_SIZE;
  if (PAGE_SIZES_NUM.includes(v)) return v as PageSizeOption;
  return DEFAULT_PAGE_SIZE;
}

export function parsePageParam(
  value: string | null | undefined,
  fallback = DEFAULT_PAGE,
): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export function parsePageSizeParam(
  value: string | null | undefined,
  fallback: PageSizeOption = DEFAULT_PAGE_SIZE,
): PageSizeOption {
  if (value == null || value === "") return fallback;
  return clampPageSize(Number(value));
}

export function parsePaginationFromSearchParams(
  params: URLSearchParams,
  options?: { defaultPageSize?: PageSizeOption },
): { page: number; pageSize: PageSizeOption } {
  const defaultPageSize = options?.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const page = parsePageParam(params.get(PAGE_PARAM));
  const rawSize =
    params.get(PAGE_SIZE_PARAM) ??
    params.get(LEGACY_SIZE_PARAM);
  const pageSize = parsePageSizeParam(rawSize, defaultPageSize);
  return { page, pageSize };
}

export function buildPaginationQueryUpdates(
  updates: Partial<{ page: number; pageSize: PageSizeOption }>,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if (updates.page !== undefined) {
    out[PAGE_PARAM] = updates.page <= 1 ? null : String(updates.page);
  }
  if (updates.pageSize !== undefined) {
    out[PAGE_SIZE_PARAM] =
      updates.pageSize === DEFAULT_PAGE_SIZE ? null : String(updates.pageSize);
    out[LEGACY_SIZE_PARAM] = null;
    if (updates.page === undefined) {
      out[PAGE_PARAM] = null;
    }
  }
  return out;
}
