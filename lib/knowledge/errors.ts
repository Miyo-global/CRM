import { NextResponse } from "next/server";

/**
 * KB-0006: the four answers every KB route gives when it will not do the work.
 *
 * Codes let the UI react without parsing prose: it hides AI buttons on
 * KB_AI_NOT_CONFIGURED and offers a reload on KB_PAGE_CONFLICT. No message here
 * carries SQL, an org id or an env value.
 */
export const KB_ERROR_CODES = {
  conflict: "KB_PAGE_CONFLICT",
  ai: "KB_AI_NOT_CONFIGURED",
  storage: "KB_STORAGE_NOT_CONFIGURED",
} as const;

export type KbNotConfiguredKind = "ai" | "storage";

/**
 * Same `{ error }` body as `err()` in lib/api/helpers.ts, built here directly so
 * these helpers stay importable without pulling the auth stack in.
 */
function kbErr(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse<never> {
  return NextResponse.json({ error: message, ...extra }, { status }) as NextResponse<never>;
}

/** Another org's page, a soft-deleted one, or one the actor may not know exists. */
export function kbNotFound(message = "Not found"): NextResponse<never> {
  return kbErr(message, 404);
}

/** Visible, but this action is out of reach. */
export function kbDenied(message = "You do not have access to this action"): NextResponse<never> {
  return kbErr(message, 403);
}

/** Someone else saved first. `currentRevision` lets the client diff or reload. */
export function kbConflict(currentRevision: number): NextResponse<never> {
  return kbErr(
    "This page changed while you were editing it. Reload to see the latest version.",
    409,
    { code: KB_ERROR_CODES.conflict, currentRevision },
  );
}

/** A missing key switches a feature off; it is never a 500. */
export function kbNotConfigured(kind: KbNotConfiguredKind): NextResponse<never> {
  const message =
    kind === "ai" ? "AI is not configured" : "File storage is not configured";
  return kbErr(message, 503, { code: KB_ERROR_CODES[kind] });
}
