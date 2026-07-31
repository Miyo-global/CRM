import { withAuth, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import {
  getAssetExportRows,
  buildAssetsCsvString,
} from "@/server/queries/hr/assets-export";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can export assets.", 403);
    }

    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const filter =
      status && ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"].includes(status)
        ? status
        : undefined;

    const rows = await getAssetExportRows(session.orgId, filter);
    const body = buildAssetsCsvString(rows);
    const filename = `assets-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
