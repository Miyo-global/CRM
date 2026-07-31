import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { getOrgMembers } from "@/server/queries/organization";
import { db } from "@/lib/db";
import {
  organizationMembers,
  invitations,
  users,
  organizations,
} from "@/lib/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { sendInvitationEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit-log";
import { hashToken } from "@/lib/secret-crypto";
import { nanoid } from "nanoid";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.string().min(1),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const page = toNumber(params.get("page")) ?? 1;
      const limitRaw = toNumber(params.get("limit")) ?? 20;
      const limit = Math.min(Math.max(limitRaw, 1), 500);
      const search = params.get("search") ?? undefined;
      const rolesParam = params.get("roles");
      const roles = rolesParam
        ? rolesParam.split(",").map((r) => r.trim()).filter(Boolean)
        : undefined;

      const data = await getOrgMembers(session.orgId, page, limit, search, roles);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load members",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      if (!isAdminOrOwner(session.user.role)) {
        return err("Forbidden", 403);
      }

      const body = await req.json();
      const input = inviteSchema.parse(body);

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        const existingMember = await db.query.organizationMembers.findFirst({
          where: and(
            eq(organizationMembers.userId, existingUser.id),
            eq(organizationMembers.orgId, session.orgId)
          ),
        });
        if (existingMember) return err("User is already a member", 409);
      }

      const existingInvitation = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.email, input.email),
          eq(invitations.orgId, session.orgId),
          gt(invitations.expiresAt, new Date()),
          isNull(invitations.acceptedAt)
        ),
      });
      if (existingInvitation) {
        return err("An invitation has already been sent to this email", 409);
      }

      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, session.orgId),
      });

      if (org?.allowedEmailDomains && org.allowedEmailDomains.length > 0) {
        const emailDomain = input.email.split("@")[1]?.toLowerCase();
        const allowed = org.allowedEmailDomains.map((d) => d.toLowerCase());
        if (!emailDomain || !allowed.includes(emailDomain)) {
          return err(
            `Email domain not allowed. Permitted: ${org.allowedEmailDomains.join(", ")}`,
            400
          );
        }
      }

      const invitationToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const invitationId = nanoid();

      await db.insert(invitations).values({
        id: invitationId,
        email: input.email,
        token: hashToken(invitationToken),
        orgId: session.orgId,
        role: input.role,
        invitedBy: session.user.id,
        expiresAt,
      });

      try {
        await sendInvitationEmail(
          input.email,
          invitationToken,
          org?.name ?? "Unknown Organization"
        );
      } catch {
        void 0;
      }

      await createAuditLog({
        action: "org.member_invited",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: invitationId,
        targetType: "invitation",
        metadata: { email: input.email, role: input.role },
      });

      return ok({ success: true, invitationId }, 201);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to invite user",
        500
      );
    }
  });
}
