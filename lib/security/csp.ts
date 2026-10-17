const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * MIYO-0132: with a nonce, script-src drops 'unsafe-inline' and uses
 * 'strict-dynamic', so an injected inline script cannot run. The proxy mints
 * one nonce per HTML request; next.config has no request to key off, so its
 * static header still falls back to 'unsafe-inline'.
 *
 * style-src keeps 'unsafe-inline': the inline styles Next and the UI
 * components emit are not nonced.
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
