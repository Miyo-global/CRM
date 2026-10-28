import { z } from "zod";

export const projectRoleSchema = z.enum(["OWNER", "MANAGER", "CONTRIBUTOR", "VIEWER"]);
export type ProjectRole = z.infer<typeof projectRoleSchema>;
const LEGACY_ROLE_MAP: Record<string, ProjectRole> = { ADMIN: "MANAGER" };

/**
 * Archiving takes a ticket off everyone's board, so a contributor may archive
 * only a ticket they reported; owners and managers may archive any
 * (QA P2-emp-contributor-full-ticket-edit). Shared by the API and the UI.
 */
export function canArchiveTicket(role: string | null | undefined, reporterId: string | null | undefined, userId: string): boolean {
  if (role === "OWNER" || role === "MANAGER") return true;
  return role === "CONTRIBUTOR" && !!reporterId && reporterId === userId;
}

export function normalizeProjectRole(raw: string | null | undefined): ProjectRole {
  const upper = (raw ?? "").trim().toUpperCase();
  const parsed = projectRoleSchema.safeParse(upper);
  if (parsed.success) return parsed.data;
  return LEGACY_ROLE_MAP[upper] ?? "CONTRIBUTOR";
}
