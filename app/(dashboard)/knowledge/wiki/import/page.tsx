import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { ImportPage } from "@/features/knowledge/components/import-page";
import { resolveKbPermissions } from "@/lib/knowledge/actor";

export const dynamic = "force-dynamic";

export default async function KnowledgeImportPage() {
  const authed = await requireAuth();
  if ("error" in authed) notFound();

  const permissions = await resolveKbPermissions(authed.orgId, authed.userId, authed.member.role);
  if (!permissions.includes("kb:pages:import") && !permissions.includes("kb:pages:export")) {
    notFound();
  }

  return <ImportPage />;
}
