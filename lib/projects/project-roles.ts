import { z } from "zod";

export const projectRoleSchema = z.enum(["OWNER", "MANAGER", "CONTRIBUTOR", "VIEWER"]);
export type ProjectRole = z.infer<typeof projectRoleSchema>;
const LEGACY_ROLE_MAP: Record<string, ProjectRole> = { ADMIN: "MANAGER" };

export function normalizeProjectRole(raw: string | null | undefined): ProjectRole {
  const upper = (raw ?? "").trim().toUpperCase();
  const parsed = projectRoleSchema.safeParse(upper);
  if (parsed.success) return parsed.data;
  return LEGACY_ROLE_MAP[upper] ?? "CONTRIBUTOR";
}
