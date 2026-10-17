import "server-only";

import { logger } from "@/lib/logger";

/**
 * MIYO-0640: Cloudflare Turnstile. With no secret configured the check is
 * skipped, so local work and the first deploy are not blocked; set
 * TURNSTILE_SECRET_KEY on production and the token becomes required.
 */
export function turnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(
  token: string | null | undefined,
  ip?: string | null,
): Promise<boolean> {
  if (!turnstileConfigured()) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY as string,
      response: token,
    });
    if (ip) body.set("remoteip", ip);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const result = (await res.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    logger.error("Turnstile verification failed", { error });
    return false;
  }
}
