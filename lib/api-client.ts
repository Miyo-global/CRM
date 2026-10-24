

import axios, { type AxiosRequestConfig } from "axios";

const BASE_URL = "/api";

/** No request may hang the UI forever. */
const DEFAULT_TIMEOUT_MS = 20_000;

const _axios = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

_axios.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { error?: string; errorId?: string } | undefined;
      if (data?.error) {
        error.message = data.errorId ? `${data.error} (ref ${data.errorId})` : data.error;
      } else {
        // Never show Axios' "Request failed with status code 500" (R3-PRJ-04).
        error.message = !error.response
          ? "Could not reach the server. Check your connection and try again."
          : error.response.status >= 500
            ? "Something went wrong. Please try again."
            : "The request could not be completed.";
      }
    }
    return Promise.reject(error);
  }
);

async function get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.get<T>(url, { params, ...config });
  return res.data;
}

/**
 * In-flight write requests, keyed by method + url + payload.
 *
 * A second click on a submit button fired a second identical request while the
 * first was still open, creating duplicate records across nearly every create
 * form (QA-0032). An identical write that is already in flight now shares that
 * request instead of starting another; a deliberate repeat after the first one
 * finishes still goes through.
 */
const inFlightWrites = new Map<string, Promise<unknown>>();

function writeKey(method: string, url: string, data?: unknown): string {
  let payload = "";
  try {
    payload = data === undefined ? "" : JSON.stringify(data);
  } catch {
    // Non-serialisable body (FormData, Blob): do not dedupe it.
    return "";
  }
  return `${method} ${url} ${payload}`;
}

async function dedupedWrite<T>(
  method: string,
  url: string,
  data: unknown,
  send: () => Promise<T>,
): Promise<T> {
  const key = writeKey(method, url, data);
  if (!key) return send();

  const existing = inFlightWrites.get(key);
  if (existing) return existing as Promise<T>;

  const request = send().finally(() => {
    inFlightWrites.delete(key);
  });
  inFlightWrites.set(key, request);
  return request;
}

async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return dedupedWrite("POST", url, data, async () => {
    const res = await _axios.post<T>(url, data, config);
    return res.data;
  });
}

async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return dedupedWrite("PUT", url, data, async () => {
    const res = await _axios.put<T>(url, data, config);
    return res.data;
  });
}

async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return dedupedWrite("PATCH", url, data, async () => {
    const res = await _axios.patch<T>(url, data, config);
    return res.data;
  });
}

async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.delete<T>(url, config);
  return res.data;
}

export const apiClient = { get, post, put, patch, delete: del } as const;

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = (error.response?.data as { error?: string })?.error;
    return msg ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export { getErrorMessage } from "./get-error-message";

export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
