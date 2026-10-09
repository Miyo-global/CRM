const ABLY_HOSTS = ["*.ably.io", "*.ably.net", "*.ably-realtime.com"];
const TURNSTILE = "https://challenges.cloudflare.com";

export function buildCsp(nodeEnv: string | undefined): string {
  const ably = ABLY_HOSTS.flatMap((h) => [`https://${h}`, `wss://${h}`]).join(" ");
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${TURNSTILE}${nodeEnv === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://api.dicebear.com https://*.r2.cloudflarestorage.com https://lh3.googleusercontent.com https://crm.miyoglobal.com",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://*.r2.cloudflarestorage.com ${TURNSTILE} ${ably}`,
    `frame-src ${TURNSTILE}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
