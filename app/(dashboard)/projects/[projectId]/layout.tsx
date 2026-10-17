import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationMembers, projects } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { resolveProjectAccess } from "@/lib/projects/project-access";
import { parseIdParam } from "@/lib/projects/require-project-access";
import { notFound } from "next/navigation";
import { AccessDeniedView } from "./access-denied-view";

async function loadProject(rawId: string) {
  const id = parseIdParam(rawId);
  const session = await auth();
  if (id === null || !session?.user?.id) return null;

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), isNull(projects.deletedAt)),
    columns: { id: true, name: true, key: true, orgId: true },
  });
  if (!project) return null;

  const member = await db.query.organizationMembers.findFirst({
    where: and(eq(organizationMembers.userId, session.user.id), eq(organizationMembers.orgId, project.orgId)),
    columns: { id: true },
  });
  if (!member) return null;

  const decision = await resolveProjectAccess(
    { user: { id: session.user.id, role: session.user.role }, orgId: project.orgId },
    id,
    "view",
  );
  return decision.ok ? project : null;
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  // /projects/build or /projects/abc is not a project id: plain 404 (MIYO-0067).
  if (parseIdParam(projectId) === null) notFound();
  const project = await loadProject(projectId);
  if (!project) return <AccessDeniedView />;

  return (
    <div className="flex h-full w-full flex-col">
      <ProjectSidebar projectId={projectId} projectName={project.name} projectKey={project.key} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>
    </div>
  );
}
