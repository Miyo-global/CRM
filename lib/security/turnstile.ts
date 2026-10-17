import "server-only";
import { logger } from "@/lib/logger";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * MIYO-0130: bot check for the public forms (project intake, and the ATS
 * apply form later).
 *
 * With no TURNSTILE_SECRET_KEY the check cannot run, so the request is let
 * through and a warning is logged: an unconfigured key must not take a public
 * form offline. Set the key to turn the check on.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    logger.warn("Turnstile is not configured; the public form is unprotected");
    return { ok: true, reason: "not-configured" };
  }

  if (!token) return { ok: false, reason: "missing-token" };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };

    if (result.success) return { ok: true };
    return { ok: false, reason: result["error-codes"]?.join(",") || "rejected" };
  } catch (error) {
    // Cloudflare being unreachable should not silently open the form.
    logger.error("Turnstile verification failed", { error });
    return { ok: false, reason: "verification-unavailable" };
  }
}
