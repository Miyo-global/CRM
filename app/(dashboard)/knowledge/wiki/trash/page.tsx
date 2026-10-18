import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { TrashPage } from "@/features/knowledge/components/trash-page";
import { resolveKbPermissions } from "@/lib/knowledge/actor";

export const dynamic = "force-dynamic";

export default async function KnowledgeTrashPage() {
  const authed = await requireAuth();
  if ("error" in authed) notFound();

  const permissions = await resolveKbPermissions(authed.orgId, authed.userId, authed.member.role);

  return (
    <TrashPage
      canPurge={permissions.includes("kb:pages:purge")}
      canSetRetention={permissions.includes("kb:settings:manage")}
    />
  );
}
