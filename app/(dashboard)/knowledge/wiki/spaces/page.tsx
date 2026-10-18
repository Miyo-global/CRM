import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { SpacesPage } from "@/features/knowledge/components/spaces-page";
import { resolveKbPermissions } from "@/lib/knowledge/actor";

export const dynamic = "force-dynamic";

export default async function KnowledgeSpacesPage() {
  const authed = await requireAuth();
  if ("error" in authed) notFound();

  // The create and edit controls are hidden without the permission; the API
  // checks it again, so hiding them is a courtesy rather than the guard.
  const permissions = await resolveKbPermissions(
    authed.orgId,
    authed.userId,
    authed.member.role,
  );

  return <SpacesPage canManage={permissions.includes("kb:spaces:manage")} />;
}
