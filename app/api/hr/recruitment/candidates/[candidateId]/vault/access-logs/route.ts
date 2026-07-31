import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, vaultAccessLogs, candidateDocumentsVault, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

type RouteParams = { params: Promise<{ candidateId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const role = session.user.role as string;
    if (!["CEO", "HR", "ADMIN"].includes(role)) {
      return err("Access denied — HR only", 403);
    }

    const { candidateId: cid } = await params;
    const candidateId = Number(cid);
    if (!Number.isFinite(candidateId)) return err("Invalid candidate ID", 400);

    const candidate = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!candidate) return err("Candidate not found", 404);

    const logs = await db
      .select({
        id: vaultAccessLogs.id,
        action: vaultAccessLogs.action,
        accessedAt: vaultAccessLogs.accessedAt,
        fileName: candidateDocumentsVault.filename,
        documentType: candidateDocumentsVault.documentType,
        accessorName: users.name,
        accessorFirstName: users.firstName,
        accessorLastName: users.lastName,
      })
      .from(vaultAccessLogs)
      .innerJoin(
        candidateDocumentsVault,
        eq(vaultAccessLogs.vaultDocumentId, candidateDocumentsVault.id)
      )
      .leftJoin(users, eq(vaultAccessLogs.accessedBy, users.id))
      .where(eq(candidateDocumentsVault.candidateId, candidateId))
      .orderBy(desc(vaultAccessLogs.accessedAt))
      .limit(100);

    return ok(
      logs.map((l) => ({
        ...l,
        accessorDisplayName:
          l.accessorFirstName && l.accessorLastName
            ? `${l.accessorFirstName} ${l.accessorLastName}`
            : (l.accessorName ?? "Unknown"),
      }))
    );
  });
}
