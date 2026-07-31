import { withAdmin, ok, err } from "@/lib/api/helpers";
import { getAllPayrolls } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const month = req.nextUrl.searchParams.get("month");
    if (!month) return err("month query param is required (YYYY-MM).", 400);
    if (!/^\d{4}-\d{2}$/.test(month)) return err("month must be in YYYY-MM format.", 400);

    const data = await getAllPayrolls(session.orgId, month);
    const actorIds = Array.from(
      new Set(
        data
          .flatMap((p) => [p.generatedBy, p.approvedBy, p.paidBy])
          .filter((id): id is string => Boolean(id))
      )
    );

    if (actorIds.length === 0) {
      return ok(
        data.map((p) => ({
          ...p,
          generatedByUser: p.generatedBy ? { id: p.generatedBy, name: null } : null,
          approvedByUser: p.approvedBy ? { id: p.approvedBy, name: null } : null,
          paidByUser: p.paidBy ? { id: p.paidBy, name: null } : null,
        }))
      );
    }

    const actorRows = await db.query.users.findMany({
      where: inArray(users.id, actorIds),
      columns: { id: true, firstName: true, lastName: true, name: true },
    });
    const actorNameById = new Map(
      actorRows.map((u) => {
        const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
        return [u.id, full || u.name || null] as const;
      })
    );
    return ok(
      data.map((p) => ({
        ...p,
        generatedByUser: p.generatedBy
          ? { id: p.generatedBy, name: actorNameById.get(p.generatedBy) ?? null }
          : null,
        approvedByUser: p.approvedBy
          ? { id: p.approvedBy, name: actorNameById.get(p.approvedBy) ?? null }
          : null,
        paidByUser: p.paidBy
          ? { id: p.paidBy, name: actorNameById.get(p.paidBy) ?? null }
          : null,
      }))
    );
  });
}
