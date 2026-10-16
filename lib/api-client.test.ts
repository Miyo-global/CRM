import { describe, expect, it, vi, beforeEach } from "vitest";

const post = vi.fn();

vi.mock("axios", () => {
  const instance = {
    get: vi.fn(),
    post,
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  };
  return {
    default: { create: () => instance, isAxiosError: () => false },
    isAxiosError: () => false,
  };
});

const { apiClient } = await import("./api-client");

describe("apiClient write dedupe", () => {
  beforeEach(() => post.mockReset());

  it("shares one request between two identical in-flight posts", async () => {
    post.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 1 } }), 10)),
    );

    const [a, b] = await Promise.all([
      apiClient.post("/hr/leaves", { reason: "x" }),
      apiClient.post("/hr/leaves", { reason: "x" }),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ id: 1 });
    expect(b).toEqual({ id: 1 });
  });

  it("sends a different payload separately", async () => {
    post.mockResolvedValue({ data: { ok: true } });
    await Promise.all([
      apiClient.post("/hr/leaves", { reason: "x" }),
      apiClient.post("/hr/leaves", { reason: "y" }),
    ]);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("sends an identical payload again once the first has finished", async () => {
    post.mockResolvedValue({ data: { ok: true } });
    await apiClient.post("/hr/leaves", { reason: "x" });
    await apiClient.post("/hr/leaves", { reason: "x" });
    expect(post).toHaveBeenCalledTimes(2);
  });
});
