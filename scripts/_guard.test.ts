import { afterEach, describe, expect, it, vi } from "vitest";
import { requireSecretEnv } from "./_guard";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TEST_SEED_SECRET;
});

function exitSpy() {
  vi.spyOn(console, "error").mockImplementation(() => {});
  return vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new Error(`exit ${code}`);
  }) as never);
}

describe("requireSecretEnv", () => {
  it("exits non-zero when the variable is unset", () => {
    const exit = exitSpy();
    expect(() => requireSecretEnv("TEST_SEED_SECRET")).toThrow("exit 1");
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("exits when the value is blank", () => {
    exitSpy();
    process.env.TEST_SEED_SECRET = "            ";
    expect(() => requireSecretEnv("TEST_SEED_SECRET")).toThrow("exit 1");
  });

  it("exits when the value is too short", () => {
    exitSpy();
    process.env.TEST_SEED_SECRET = "short";
    expect(() => requireSecretEnv("TEST_SEED_SECRET")).toThrow("exit 1");
  });

  it("returns the value when it is long enough", () => {
    process.env.TEST_SEED_SECRET = "Long-Enough-Secret-1";
    expect(requireSecretEnv("TEST_SEED_SECRET")).toBe("Long-Enough-Secret-1");
  });
});
