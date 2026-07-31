/**
 * Next.js instrumentation hook.
 * Runs once when the server starts (before any route is handled).
 *
 * Patches global setTimeout to suppress the Node.js TimeoutNegativeWarning
 * that occurs in Turbopack dev mode when server component revalidation
 * timers go negative (e.g., stale cached ProjectLayout).
 *
 * @see https://github.com/vercel/next.js/issues/61888
 */
export async function register() {
  if (process.env.NODE_ENV === "development") {
    const origSetTimeout = globalThis.setTimeout;
    // @ts-expect-error — overriding the global with a patched version
    globalThis.setTimeout = function patchedSetTimeout(
      callback: (...args: unknown[]) => void,
      ms?: number,
      ...args: unknown[]
    ) {
      const safeMs = typeof ms === "number" && ms < 0 ? 0 : ms;
      return origSetTimeout(callback, safeMs, ...args);
    };
    // Preserve the original's properties (e.g., __promisify__)
    Object.setPrototypeOf(globalThis.setTimeout, origSetTimeout);
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env");
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
