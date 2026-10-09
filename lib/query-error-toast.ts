import axios from "axios";
import { getApiError } from "@/lib/api-client";

const SILENT_STATUSES = new Set([401, 403, 404]);

export function queryErrorToast(error: unknown): { id: string; message: string } | null {
  if (axios.isCancel(error)) return null;
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && SILENT_STATUSES.has(status)) return null;
  const message = `Couldn't load data: ${getApiError(error)}`;
  return { id: `query-error:${message}`, message };
}
