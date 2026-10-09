export type PageResult<T> = { items: T[]; total: number };

export async function fetchAllPages<T>(
  fetchPage: (pageIndex: number) => Promise<PageResult<T>>,
  maxPages = 50,
): Promise<T[]> {
  const all: T[] = [];
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const { items, total } = await fetchPage(pageIndex);
    all.push(...items);
    if (items.length === 0 || all.length >= total) break;
  }
  return all;
}
