import { describe, expect, it } from "vitest";
import { runConcurrently } from "./run-concurrently";

describe("runConcurrently", () => {
  it("starts every task before any finishes (FR1-013: onboarding no longer waits step by step)", async () => {
    const started: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const task = (name: string) => async () => {
      started.push(name);
      await gate;
    };
    const run = runConcurrently({ email: task("email"), checklist: task("checklist"), audit: task("audit") });
    await Promise.resolve();
    expect(started).toEqual(["email", "checklist", "audit"]);
    release();
    expect(await run).toEqual({ email: true, checklist: true, audit: true });
  });

  it("reports failures without stopping the rest, and skips null tasks", async () => {
    const boom = new Error("smtp down");
    const out = await runConcurrently({
      email: async () => {
        throw boom;
      },
      audit: async () => undefined,
      skills: null,
    });
    expect(out).toEqual({ email: boom, audit: true });
  });
});
