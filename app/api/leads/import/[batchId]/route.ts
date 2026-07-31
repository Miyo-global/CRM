import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leadImportBatches } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  return withAuth(async (session) => {
    const { batchId } = await params;
    const id = Number(batchId);

    if (!id || isNaN(id)) {
      return err("Invalid batch ID", 400);
    }

    const batch = await db.query.leadImportBatches.findFirst({
      where: and(
        eq(leadImportBatches.id, id),
        eq(leadImportBatches.orgId, session.orgId)
      ),
    });

    if (!batch) {
      return err("Batch not found", 404);
    }

    return ok(batch);
  });
}
