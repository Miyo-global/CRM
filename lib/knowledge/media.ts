/**
 * KB-0057: what a page may hold, and how big.
 *
 * The caps and the type list are the policy; keeping them here rather than in
 * the route means the UI and the tests read the same numbers. The checks are
 * content-based: a client-supplied MIME type is a claim, not evidence, so the
 * magic bytes decide.
 *
 * Streamline: SB/modules/kb/wiki/kb-media.service.ts (IMAGE_CAP, VIDEO_CAP,
 * AUDIO_CAP, DOC_CAP, MAX_IMAGE_PIXELS, DOC_TYPES).
 */
import "server-only";

const MB = 1024 * 1024;

export const IMAGE_CAP = 10 * MB;
export const VIDEO_CAP = 100 * MB;
export const AUDIO_CAP = 25 * MB;
export const DOC_CAP = 25 * MB;

/** A decompression bomb is small on disk and enormous in memory. */
export const MAX_IMAGE_PIXELS = 50_000_000;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm"] as const;
export const DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "text/markdown",
] as const;

export type KbMediaKind = "image" | "video" | "audio" | "document";

export interface MediaRule {
  kind: KbMediaKind;
  cap: number;
}

export function mediaRuleFor(mimeType: string): MediaRule | null {
  if ((IMAGE_TYPES as readonly string[]).includes(mimeType)) return { kind: "image", cap: IMAGE_CAP };
  if ((VIDEO_TYPES as readonly string[]).includes(mimeType)) return { kind: "video", cap: VIDEO_CAP };
  if ((AUDIO_TYPES as readonly string[]).includes(mimeType)) return { kind: "audio", cap: AUDIO_CAP };
  if ((DOC_TYPES as readonly string[]).includes(mimeType)) return { kind: "document", cap: DOC_CAP };
  return null;
}

export type MediaRejection =
  | { code: "unsupported_type"; status: 400; message: string }
  | { code: "too_large"; status: 413; message: string }
  | { code: "content_mismatch"; status: 400; message: string };

/** Pure: everything that can be decided from the type and the size alone. */
export function checkMediaEnvelope(
  mimeType: string,
  size: number,
): { rule: MediaRule } | { rejection: MediaRejection } {
  const rule = mediaRuleFor(mimeType);
  if (!rule) {
    return {
      rejection: {
        code: "unsupported_type",
        status: 400,
        message: `${mimeType || "That file type"} cannot be attached to a page.`,
      },
    };
  }
  if (size <= 0) {
    return {
      rejection: { code: "content_mismatch", status: 400, message: "That file is empty." },
    };
  }
  if (size > rule.cap) {
    return {
      rejection: {
        code: "too_large",
        status: 413,
        message: `A ${rule.kind} may be up to ${Math.round(rule.cap / MB)} MB.`,
      },
    };
  }
  return { rule };
}
