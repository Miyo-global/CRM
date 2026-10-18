import { describe, expect, it } from "vitest";

import type { KbImportJob } from "@/lib/api/hooks/knowledge";

import {
  importJobFailedTitles,
  importJobIsRunning,
  importJobLabel,
  importJobSummary,
} from "./import-job-label";

const job = (overrides: Partial<KbImportJob> = {}): KbImportJob => ({
  id: 1,
  status: "completed",
  sourceType: "markdown",
  totalItems: 3,
  processedItems: 3,
  succeededItems: 3,
  failedItems: 0,
  duplicateItems: 0,
  ...overrides,
});

describe("KB-0088: import job labels", () => {
  it("names each status in plain words", () => {
    expect(importJobLabel({ status: "pending" }).label).toBe("Queued");
    expect(importJobLabel({ status: "processing" }).label).toBe("Importing");
    expect(importJobLabel({ status: "completed" }).tone).toBe("success");
    expect(importJobLabel({ status: "failed" }).tone).toBe("danger");
  });

  it("falls back to the raw status rather than showing nothing", () => {
    expect(importJobLabel({ status: "something_new" }).label).toBe("something_new");
  });

  it("shows progress while it runs", () => {
    expect(importJobSummary(job({ status: "processing", processedItems: 1 }))).toBe("1 of 3");
    expect(importJobSummary(job({ status: "pending" }))).toBe("Waiting to start");
  });

  it("counts what came through, what was already there and what failed", () => {
    expect(importJobSummary(job())).toBe("3 imported");
    expect(
      importJobSummary(job({ succeededItems: 1, duplicateItems: 1, failedItems: 1 })),
    ).toBe("1 imported, 1 already there, 1 failed");
  });

  it("lists the titles that did not come through", () => {
    expect(
      importJobFailedTitles(
        job({ errorReport: { errors: [{ title: "Broken", reason: "Empty body" }] } }),
      ),
    ).toEqual(["Broken"]);
    expect(importJobFailedTitles(job())).toEqual([]);
  });

  it("knows which jobs are still worth polling", () => {
    expect(importJobIsRunning({ status: "processing" })).toBe(true);
    expect(importJobIsRunning({ status: "pending" })).toBe(true);
    expect(importJobIsRunning({ status: "completed" })).toBe(false);
    expect(importJobIsRunning({ status: "cancelled" })).toBe(false);
  });
});
