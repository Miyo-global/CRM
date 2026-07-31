import { withAuth, err } from "@/lib/api/helpers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appraisals } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { isManagerOf } from "@/lib/rbac/manager";
import type { NextRequest } from "next/server";
import type { AuthSession } from "@/lib/api/helpers";

async function canExport(session: AuthSession, appraisal: { orgId: string; userId: string; reviewerId: string | null }) {
  if (appraisal.orgId !== session.orgId) return false;
  if (isAdminOrOwner(session.user.role)) return true;
  if (session.user.role === "ADMIN") return true;
  if (appraisal.reviewerId === session.user.id) return true;
  return isManagerOf(session.user.id, appraisal.userId);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    const { id } = await params;
    const appraisalId = Number(id);
    if (!appraisalId) return err("Invalid id.", 400);

    const row = await db.query.appraisals.findFirst({
      where: and(eq(appraisals.id, appraisalId), eq(appraisals.orgId, session.orgId)),
      with: {
        user: { columns: { id: true, name: true, email: true } },
        reviewer: { columns: { id: true, name: true } },
        cycle: true,
        categoryRatings: { with: { category: true } },
        stages: { orderBy: (s, { asc }) => [asc(s.id)] },
      },
    });
    if (!row) return err("Not found.", 404);
    if (!(await canExport(session, row))) return err("Only HR, management, or the reporting manager may export.", 403);

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 12;
    doc.setFontSize(14);
    doc.text("Performance appraisal", 10, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Employee: ${row.user?.name ?? row.userId}`, 10, y);
    y += 6;
    doc.text(`Reviewer: ${row.reviewer?.name ?? ""}`, 10, y);
    y += 6;
    doc.text(`Stage: ${row.currentStage ?? ""}`, 10, y);
    y += 6;
    doc.text(`Overall rating: ${row.overallRating ?? ""}`, 10, y);
    y += 10;
    doc.text("Category ratings (manager):", 10, y);
    y += 6;
    for (const r of row.categoryRatings ?? []) {
      const line = `${r.category?.name ?? "?"}: score ${r.managerScore ?? ""} ${r.managerComment ? `— ${r.managerComment.slice(0, 80)}` : ""}`;
      const lines = doc.splitTextToSize(line, 180);
      doc.text(lines, 10, y);
      y += 6 * lines.length;
      if (y > 270) {
        doc.addPage();
        y = 12;
      }
    }
    y += 6;
    doc.text("Outcome notes:", 10, y);
    y += 6;
    doc.text(doc.splitTextToSize(row.outcomeNotes ?? "", 180), 10, y);

    const buf = Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="appraisal-${appraisalId}.pdf"`,
      },
    });
  });
}
