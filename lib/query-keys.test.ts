import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

describe("queryKeys.hr.terminations (R3-ADM-04)", () => {
  it("is the prefix of the termination list key, so invalidating it refreshes /hr/termination", async () => {
    const qc = new QueryClient();
    const listKey = [...queryKeys.hr.all, "termination", "list"];
    qc.setQueryData(listKey, []);
    await qc.invalidateQueries({ queryKey: queryKeys.hr.terminations() });
    expect(qc.getQueryState(listKey)?.isInvalidated).toBe(true);
  });
});

describe("param'd list keys (R3-HR-12)", () => {
  it("invalidating documents() refreshes every filtered documents list", async () => {
    const qc = new QueryClient();
    const filtered = queryKeys.hr.documents({ type: "POLICY" });
    const unfiltered = queryKeys.hr.documents();
    qc.setQueryData(filtered, []);
    qc.setQueryData(unfiltered, []);
    await qc.invalidateQueries({ queryKey: queryKeys.hr.documents() });
    expect(qc.getQueryState(filtered)?.isInvalidated).toBe(true);
    expect(qc.getQueryState(unfiltered)?.isInvalidated).toBe(true);
  });
});
