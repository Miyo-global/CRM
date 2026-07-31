
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type ApiOk<T = void> = { success: true; data: T };
export type ApiErr = { success: false; error: string };
export type ApiResult<T = void> = ApiOk<T> | ApiErr;

export type Awaited<T> = T extends Promise<infer U> ? U : T;
