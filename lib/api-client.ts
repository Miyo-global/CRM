

import axios, { type AxiosRequestConfig } from "axios";

const BASE_URL = "/api";

const _axios = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

_axios.interceptors.response.use(
  (res) => res,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const apiMessage = (error.response?.data as { error?: string })?.error;
      if (apiMessage) {

        error.message = apiMessage;
      }
    }
    return Promise.reject(error);
  }
);

async function get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.get<T>(url, { params, ...config });
  return res.data;
}

async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.post<T>(url, data, config);
  return res.data;
}

async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.put<T>(url, data, config);
  return res.data;
}

async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.patch<T>(url, data, config);
  return res.data;
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
