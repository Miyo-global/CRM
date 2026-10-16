import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber, serverError } from "@/lib/api/helpers";
import { getOrgMembers } from "@/server/queries/organization";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createOrgInvitation } from "@/lib/org/create-invitation";
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
      return serverError(error, { route: "organization/members", orgId: session.orgId }, "Failed to load members.");
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

      const result = await createOrgInvitation({
        orgId: session.orgId,
        email: input.email,
        role: input.role,
        invitedBy: session.user.id,
      });
      if (!result.ok) return err(result.message, result.status);
      const { invitationId } = result;

      return ok({ success: true, invitationId }, 201);
    } catch (error) {
      return serverError(error, { route: "organization/members", orgId: session.orgId }, "Failed to invite user.");
    }
  });
}
