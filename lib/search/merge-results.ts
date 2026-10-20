export type SearchResultType =
  | "ticket"
  | "project"
  | "employee"
  | "event"
  | "announcement"
  | "holiday"
  | "helpdesk"
  | "leave";

export interface SearchResult {
  id: number | string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

/**
 * Merge the per-source search results. One failing source (a bad column, a
 * slow table) used to reject the whole Promise.all and the palette got
 * nothing (QA-BUG-06); now its results are dropped and its name reported.
 */
export function mergeSearchResults(
  sources: readonly string[],
  settled: readonly PromiseSettledResult<SearchResult[]>[],
): { results: SearchResult[]; total: number; failedSources: string[] } {
  const results: SearchResult[] = [];
  const failedSources: string[] = [];
  settled.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") results.push(...outcome.value);
    else failedSources.push(sources[i] ?? `source-${i}`);
  });
  return { results, total: results.length, failedSources };
}
