import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { SpaceDetailPage } from "@/features/knowledge/components/space-detail-page";
import { resolveKbPermissions } from "@/lib/knowledge/actor";

export const dynamic = "force-dynamic";

export default async function KnowledgeSpacePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const id = Number(spaceId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const authed = await requireAuth();
  if ("error" in authed) notFound();

  const permissions = await resolveKbPermissions(
    authed.orgId,
    authed.userId,
    authed.member.role,
  );

  return (
    <SpaceDetailPage spaceId={id} canManage={permissions.includes("kb:spaces:manage")} />
  );
}
