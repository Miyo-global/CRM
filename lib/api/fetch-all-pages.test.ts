import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./fetch-all-pages";

const pages = (rows: number[], size: number, total = rows.length) => (i: number) =>
  Promise.resolve({ items: rows.slice(i * size, i * size + size), total });

describe("fetchAllPages", () => {
  it("propagates a failed page instead of returning partial data", async () => {
    const fetchPage = vi.fn(async (i: number) => {
      if (i === 1) throw new Error("400");
      return { items: [1, 2], total: 4 };
    });
    await expect(fetchAllPages(fetchPage)).rejects.toThrow("400");
  });

  it("stops on an empty page even when total says there is more", async () => {
    const fetchPage = vi.fn(pages([1, 2, 3], 2, 99));
    expect(await fetchAllPages(fetchPage)).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("never requests more than maxPages", async () => {
    const fetchPage = vi.fn(async () => ({ items: [1], total: 1000 }));
    expect(await fetchAllPages(fetchPage, 3)).toHaveLength(3);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it("makes one call for an empty collection", async () => {
    const fetchPage = vi.fn(pages([], 100));
    expect(await fetchAllPages(fetchPage)).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("collects every row across pages", async () => {
    const rows = Array.from({ length: 250 }, (_, i) => i);
    const fetchPage = vi.fn(pages(rows, 100));
    expect(await fetchAllPages(fetchPage)).toEqual(rows);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
});
