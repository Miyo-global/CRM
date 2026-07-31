import { type NextRequest, NextResponse } from "next/server";
import { withAuth, err, parseBody } from "@/lib/api/helpers";
import { getDocumentsForExport } from "@/server/queries/hr";
import { documentExportFiltersSchema } from "@/lib/hr/documents-export-filters";
import { buildDocumentsZipBuffer } from "@/lib/hr/build-documents-zip";

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    let filters;
    try {
      filters = await parseBody(req, documentExportFiltersSchema);
    } catch {
      return err("Invalid filters", 400);
    }

    const isDocumentsAdmin =
      session.user.role === "CEO" || session.user.role === "HR" || session.user.role === "ADMIN";
    if (filters.filterUserId && filters.filterUserId !== session.user.id && !isDocumentsAdmin) {
      return err("Not authorized to export other users' documents.", 403);
    }

    const docs = await getDocumentsForExport(session.orgId, session.user.id, isDocumentsAdmin, filters);
    const { buffer, included, skipped } = await buildDocumentsZipBuffer(docs, { maxFiles: 100 });

    const label = new Date().toISOString().slice(0, 10);
    const filename = `documents-export-${label}.zip`;

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Documents-Export-Count": String(included),
        "X-Documents-Export-Skipped": String(skipped),
      },
    });
  });
}
