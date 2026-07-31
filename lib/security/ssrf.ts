// Guards outbound, user-controlled URLs against SSRF to private / internal /
// loopback / link-local / cloud-metadata hosts. Use for any server-side fetch
// whose target URL originates from user input (webhooks, imports, etc.).

export function isBlockedSsrfHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h === "metadata.google.internal" ||
    h === "169.254.169.254" ||
    h.endsWith(".localhost") ||
    h.endsWith(".internal") ||
    h.endsWith(".local")
  ) {
    return true;
  }

  // IPv4 literal: block loopback, private, link-local, CGNAT, "this host".
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if ([a, b, Number(v4[3]), Number(v4[4])].some((o) => o > 255)) return true;
    if (a === 0 || a === 10 || a === 127) return true; // this-host / private / loopback
    if (a === 192 && b === 168) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  // IPv6 loopback / unique-local (fc00::/7) / link-local (fe80::/10) / mapped.
  if (
    h === "::1" ||
    h.startsWith("fc") ||
    h.startsWith("fd") ||
    h.startsWith("fe80") ||
    h.startsWith("::ffff:")
  ) {
    return true;
  }

  return false;
}

// True only for a syntactically valid, public HTTPS URL safe to fetch.
export function isSafePublicHttpsUrl(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  return !isBlockedSsrfHostname(parsed.hostname);
}
