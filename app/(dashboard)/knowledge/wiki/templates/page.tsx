import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { TemplatesPage } from "@/features/knowledge/components/templates-page";
import { resolveKbPermissions } from "@/lib/knowledge/actor";

export const dynamic = "force-dynamic";

export default async function KnowledgeTemplatesPage() {
  const authed = await requireAuth();
  if ("error" in authed) notFound();

  const permissions = await resolveKbPermissions(authed.orgId, authed.userId, authed.member.role);

  return <TemplatesPage canManage={permissions.includes("kb:templates:manage")} />;
}
