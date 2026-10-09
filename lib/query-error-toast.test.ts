import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders, CanceledError } from "axios";
import { queryErrorToast } from "./query-error-toast";

function apiError(status: number, error?: string) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data: error ? { error } : {},
  });
}

describe("queryErrorToast", () => {
  it("stays silent for 401, 403, 404 and cancelled requests", () => {
    expect(queryErrorToast(apiError(401, "Unauthorized"))).toBeNull();
    expect(queryErrorToast(apiError(403, "Forbidden"))).toBeNull();
    expect(queryErrorToast(apiError(404, "Not found"))).toBeNull();
    expect(queryErrorToast(new CanceledError())).toBeNull();
  });

  it("uses the API error message for validation and server failures", () => {
    expect(queryErrorToast(apiError(400, "Validation failed: limit: Too big"))?.message).toBe(
      "Couldn't load data: Validation failed: limit: Too big",
    );
    expect(queryErrorToast(apiError(500))?.message).toBe("Couldn't load data: Request failed");
  });

  it("dedupes repeated failures by message", () => {
    expect(queryErrorToast(apiError(500, "Boom"))?.id).toBe(queryErrorToast(apiError(500, "Boom"))?.id);
  });

  it("handles network errors and plain errors", () => {
    expect(queryErrorToast(new Error("Network Error"))?.message).toBe("Couldn't load data: Network Error");
  });
});
