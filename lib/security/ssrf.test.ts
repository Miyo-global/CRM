import { describe, expect, it } from "vitest";
import { isSafePublicHttpsUrlResolved } from "./ssrf";

const resolvesTo = (...addresses: string[]) => async () => addresses;

describe("isSafePublicHttpsUrlResolved (SEC-0008)", () => {
  it("blocks a public hostname that resolves to the metadata address", async () => {
    expect(
      await isSafePublicHttpsUrlResolved("https://rebind.example.com/hook", resolvesTo("169.254.169.254")),
    ).toBe(false);
  });

  it("blocks when any answer is private", async () => {
    expect(
      await isSafePublicHttpsUrlResolved("https://hook.example.com", resolvesTo("93.184.216.34", "10.0.0.5")),
    ).toBe(false);
  });

  it("allows a host that resolves to public addresses only", async () => {
    expect(await isSafePublicHttpsUrlResolved("https://hook.example.com", resolvesTo("93.184.216.34"))).toBe(true);
  });

  it("blocks a host with no answers or a failing lookup", async () => {
    expect(await isSafePublicHttpsUrlResolved("https://hook.example.com", resolvesTo())).toBe(false);
    expect(
      await isSafePublicHttpsUrlResolved("https://hook.example.com", async () => {
        throw new Error("NXDOMAIN");
      }),
    ).toBe(false);
  });

  it("still rejects plain http and literal private hosts", async () => {
    expect(await isSafePublicHttpsUrlResolved("http://hook.example.com", resolvesTo("93.184.216.34"))).toBe(false);
    expect(await isSafePublicHttpsUrlResolved("https://127.0.0.1/hook", resolvesTo("127.0.0.1"))).toBe(false);
  });
});
