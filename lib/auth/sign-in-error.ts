/**
 * next-auth's signIn({ redirect: false }) builds a URL from the response. A
 * rate-limited sign-in answers 429 JSON with no url, so it throws a bare
 * TypeError ("Failed to construct 'URL'") that the form showed verbatim.
 */
export const SIGN_IN_RATE_LIMITED =
  "Too many sign-in attempts. Wait a few minutes, then try again.";

export function signInThrownMessage(error: unknown): string | null {
  if (!(error instanceof TypeError)) return null;
  if (error.message.includes("fetch")) return "No internet connection. Check your network and try again.";
  if (error.message.includes("URL")) return SIGN_IN_RATE_LIMITED;
  return null;
}
