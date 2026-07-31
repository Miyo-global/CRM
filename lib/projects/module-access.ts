import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMembers, projects } from "@/lib/db/schema";
import { isExpenseAdmin } from "@/lib/constants/roles";

const PROJECT_MODULE_MANAGER_ROLES = ["ADMIN", "MANAGER", "OWNER"] as const;

export async function canUserManageProjectModules(opts: {
  orgId: string;
  projectId: number;
  userId: string;
  orgRole: string | null | undefined;
}): Promise<boolean> {
  if (isExpenseAdmin(opts.orgRole)) return true;

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, opts.projectId), eq(projects.orgId, opts.orgId)),
    columns: { managerId: true },
  });
  if (!project) return false;
  if (project.managerId && project.managerId === opts.userId) return true;

  const member = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, opts.projectId),
      eq(projectMembers.userId, opts.userId),
    ),
    columns: { role: true },
  });
  const r = member?.role?.toUpperCase() ?? "";
  return PROJECT_MODULE_MANAGER_ROLES.some((allowed) => r === allowed);
}
