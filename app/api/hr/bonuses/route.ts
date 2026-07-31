import { type NextRequest } from "next/server";
import { withAuth, withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { bonuses, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { hasRole } from "@/lib/constants/roles";
import { BONUS_MANAGE_ROLES } from "@/lib/constants/hr";
import { createBonusBodySchema } from "@/lib/validations/bonus";
import { ZodError } from "zod";

function zodFieldMessage(error: ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? "Invalid bonus details.";
}

function isDbEnumError(e: unknown): boolean {
  const contains = (v: unknown) => typeof v === "string" && v.includes("invalid input value for enum");
  if (!(e instanceof Error)) return false;
  return contains(e.message) || contains((e.cause as Error | undefined)?.message);
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const canManage = hasRole(session.user.role, BONUS_MANAGE_ROLES);
    const mineOnly = req.nextUrl.searchParams.get("mine") === "true";
    const selfOnly = !canManage || mineOnly;

    const rows = await db
      .select({
        id: bonuses.id,
        userId: bonuses.userId,
        employeeName: users.name,
        amount: bonuses.amount,
        type: bonuses.type,
        reason: bonuses.reason,
        month: bonuses.month,
        status: bonuses.status,
        approvedAt: bonuses.approvedAt,
        createdAt: bonuses.createdAt,
      })
      .from(bonuses)
      .leftJoin(users, eq(bonuses.userId, users.id))
      .where(
        selfOnly
          ? and(eq(bonuses.orgId, session.orgId), eq(bonuses.userId, session.user.id))
          : eq(bonuses.orgId, session.orgId),
      )
      .orderBy(desc(bonuses.createdAt));

    return ok(rows);
  });
}

export async function POST(req: NextRequest) {
  return withRoles(BONUS_MANAGE_ROLES)(async (session) => {
    try {
      const body = await parseBody(req, createBonusBodySchema);

      const membership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, body.userId),
          eq(organizationMembers.orgId, session.orgId),
        ),
      });
      if (!membership) return err("Employee not found.", 404);

      const [record] = await db
        .insert(bonuses)
        .values({
          orgId: session.orgId,
          userId: body.userId,
          type: body.type,
          amount: body.amount.toString(),
          reason: body.reason ?? null,
          month: body.month ?? null,
          status: "PENDING",
        })
        .returning();

      return ok(record, 201);
    } catch (e) {
      if (e instanceof ZodError) {
        return err(zodFieldMessage(e), 400);
      }
      if (isDbEnumError(e)) {
        return err("This bonus type is not yet supported. Please contact your administrator.", 422);
      }
      throw e;
    }
  });
}
