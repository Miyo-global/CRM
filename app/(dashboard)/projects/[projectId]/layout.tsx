import { getProjectById } from "@/server/actions/project-actions";
import { notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationMembers, projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { AccessDeniedView } from "./access-denied-view";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numId = Number(projectId);
  if (isNaN(numId)) return notFound();

  const session = await auth();
  if (!session?.user?.id) return notFound();

  const projectCheck = await db.query.projects.findFirst({
    where: eq(projects.id, numId),
    columns: { id: true, name: true, key: true, orgId: true, managerId: true },
  });
  if (!projectCheck) return notFound();

  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.userId, session.user.id),
      eq(organizationMembers.orgId, projectCheck.orgId)
    ),
  });
  if (!member) return notFound();

  const project = await getProjectById(numId);
  if (!project) {
    return <AccessDeniedView projectName={projectCheck.name} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full">

      <ProjectSidebar
        projectId={projectId}
        projectName={project.name}
        projectKey={project.key}
      />

      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
