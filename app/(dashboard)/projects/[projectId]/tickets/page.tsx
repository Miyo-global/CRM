import { redirect } from "next/navigation";

/** The ticket list is the project board; the breadcrumb parent 404'd (R3-INV-03). */
export default async function ProjectTicketsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/projects/${encodeURIComponent(projectId)}`);
}
