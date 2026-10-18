/**
 * KB-0069: which tree branches are open.
 *
 * Kept in localStorage per user, not on the server: it is a view preference,
 * and a tree that collapses on every reload is worse than one that is
 * occasionally out of date. Every read and write is guarded, because a private
 * window or blocked site data makes these throw.
 */
const STORAGE_KEY = "kb-tree-expanded";

export function readExpanded(): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

export function writeExpanded(ids: number[]): void {
  try {
    // Cap it: an explored tree should not grow an unbounded key.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-200)));
  } catch {
    // No storage: the tree still works, it just forgets.
  }
}

/**
 * Whether `target` is inside `pageId`'s own subtree, from the parent links the
 * client already has. A page cannot be moved under its own descendant, and
 * blocking the drop is kinder than a 400 after it.
 */
export function isWithinSubtree(
  pageId: number,
  target: number,
  parentOf: Map<number, number | null>,
): boolean {
  if (pageId === target) return true;

  let current: number | null | undefined = target;
  // The depth cap matches the server's (MAX_TREE_DEPTH), and also stops a
  // cycle in stale client data from spinning here.
  for (let depth = 0; depth < 50 && current != null; depth += 1) {
    if (current === pageId) return true;
    current = parentOf.get(current) ?? null;
  }
  return false;
}
