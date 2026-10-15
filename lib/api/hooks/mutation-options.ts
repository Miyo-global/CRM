/**
 * Merge a caller's mutation options into a hook's own options.
 *
 * Spreading `...options` last silently replaced the hook's `onSuccess` — the
 * one that invalidates the list — whenever a caller passed its own `onSuccess`
 * to close a dialog or show a toast. That is why newly created rows did not
 * appear until a reload (A40). Here both callbacks run, the hook's first.
 */
const CALLBACKS = ["onMutate", "onSuccess", "onError", "onSettled"] as const;

type Fn = (...args: never[]) => unknown;

export function mergeMutationOptions<T extends object>(
  base: T,
  /** Caller options. Loosely typed because hooks pass them through verbatim. */
  options?: object | null,
): T {
  if (!options) return base;

  const baseRecord = base as unknown as Record<string, unknown>;
  const optionsRecord = options as unknown as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...baseRecord, ...optionsRecord };

  for (const key of CALLBACKS) {
    const ours = baseRecord[key] as Fn | undefined;
    const theirs = optionsRecord[key] as Fn | undefined;
    if (typeof ours === "function" && typeof theirs === "function") {
      merged[key] = (...args: never[]) => {
        ours(...args);
        return theirs(...args);
      };
    }
  }

  return merged as unknown as T;
}
