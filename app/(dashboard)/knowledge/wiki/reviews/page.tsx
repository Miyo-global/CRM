import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/require-auth";
import { ReviewsPage } from "@/features/knowledge/components/reviews-page";
import { resolveKbPermissions } from "@/lib/knowledge/actor";

export const dynamic = "force-dynamic";

export default async function KnowledgeReviewsPage() {
  const authed = await requireAuth();
  if ("error" in authed) notFound();

  const permissions = await resolveKbPermissions(authed.orgId, authed.userId, authed.member.role);
  if (!permissions.includes("kb:reviews:view") && !permissions.includes("kb:reviews:manage")) {
    notFound();
  }

  return <ReviewsPage canDecide={permissions.includes("kb:reviews:manage")} />;
}
