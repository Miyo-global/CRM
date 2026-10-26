const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * MIYO-0132: with a nonce, script-src drops 'unsafe-inline' and uses
 * 'strict-dynamic', so an injected inline script cannot run. The proxy mints
 * one nonce per HTML request; next.config has no request to key off, so its
 * static header (API routes only) still falls back to 'unsafe-inline'.
 * Under 'strict-dynamic' the Turnstile host entry is ignored by CSP3
 * browsers; Turnstile still loads because the nonced app bundle injects its
 * script tag, and trust propagates to scripts a trusted script creates.
 *
 * style-src keeps 'unsafe-inline' (FR1-035, accepted risk): React style=""
 * attributes are everywhere and no nonce covers attributes, and sonner,
 * Radix ScrollArea and react-remove-scroll inject <style> tags without a
 * nonce. A nonce-only style-src breaks toasts, dialogs and scroll areas.
 * Inline CSS cannot run script, and script-src above is what stops XSS.
 * Revisit with style-src-elem + nonce once those libraries accept one.
 */
export function buildCsp(nodeEnv: string | undefined, nonce?: string): string {
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE}${nodeEnv === "development" ? " 'unsafe-eval'" : ""}`
    : `script-src 'self' 'unsafe-inline' ${TURNSTILE}${nodeEnv === "development" ? " 'unsafe-eval'" : ""}`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://api.dicebear.com https://*.r2.cloudflarestorage.com https://lh3.googleusercontent.com https://crm.miyoglobal.com",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://*.r2.cloudflarestorage.com ${TURNSTILE}`,
    `frame-src 'self' blob: ${TURNSTILE}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
