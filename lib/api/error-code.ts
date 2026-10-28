/**
 * Machine-readable `code` for the `{ error, code }` envelope every /api/*
 * error carries (QA P2 api-error-envelope). Edge-safe: proxy.ts uses it too.
 */
const CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  410: "GONE",
  413: "PAYLOAD_TOO_LARGE",
  422: "UNPROCESSABLE_ENTITY",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  503: "SERVICE_UNAVAILABLE",
};

export function errorCode(status: number): string {
  return CODES[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST");
}
