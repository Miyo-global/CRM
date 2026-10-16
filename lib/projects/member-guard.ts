import { normalizeProjectRole, type ProjectRole } from "@/lib/projects/project-roles";

const LEADS: readonly ProjectRole[] = ["OWNER", "MANAGER"];

type Member = { userId: string; role: string | null };

export function leavesProjectWithoutLead(
  members: Member[],
  managerId: string | null,
  change: { userId: string; nextRole: ProjectRole | null },
): boolean {
  const leads = new Set(
    members.filter((m) => LEADS.includes(normalizeProjectRole(m.role))).map((m) => m.userId),
  );
  if (managerId) leads.add(managerId);
  if (!leads.has(change.userId)) return false;
  if (change.nextRole && LEADS.includes(change.nextRole)) return false;
  if (change.userId === managerId) return true;
  leads.delete(change.userId);
  return leads.size === 0;
}
