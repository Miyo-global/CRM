/**
 * Start every task at once and wait for all of them. Each result is `true`
 * when the task succeeded or the error it threw; a null task is skipped.
 * No task's failure stops the others.
 */
export async function runConcurrently<K extends string>(
  tasks: Record<K, (() => Promise<unknown>) | null | undefined>,
): Promise<Partial<Record<K, true | unknown>>> {
  const keys = (Object.keys(tasks) as K[]).filter((k) => tasks[k]);
  const settled = await Promise.allSettled(keys.map((k) => (tasks[k] as () => Promise<unknown>)()));
  const out: Partial<Record<K, true | unknown>> = {};
  settled.forEach((r, i) => {
    out[keys[i]] = r.status === "fulfilled" ? true : r.reason;
  });
  return out;
}
