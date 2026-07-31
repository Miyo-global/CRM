/** Safe in-app back target from `?returnTo=` (must be same-origin path under `allowedPrefix`). */
export function resolveBackHref(
  returnTo: string | null | undefined,
  fallback: string,
  allowedPrefix = "/hr/",
): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return fallback;
  }
  if (!returnTo.startsWith(allowedPrefix)) {
    return fallback;
  }
  return returnTo;
}
