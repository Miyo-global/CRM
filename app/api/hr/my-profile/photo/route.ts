import type { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAuth, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { invalidateUserSession } from "@/lib/auth";
import { storedFileRefSchema } from "@/lib/validations/stored-file-ref";

/**
 * Self-service profile photo. PATCH /api/hr/employees/:id needs
 * hr:employees:update, which an Employee does not hold, so they could not
 * change their own photo. This route only ever writes the caller's own
 * `image`; the name and every other HR field stay on the HR route.
 */
const schema = z.object({
  image: storedFileRefSchema.max(2048, "Image URL is too long").or(z.literal("")),
});

export async function PATCH(req: NextRequest) {
  return withAuth(async (session) => {
    const { image } = await parseBody(req, schema);
    await db.update(users).set({ image: image || null }).where(eq(users.id, session.user.id));
    await invalidateUserSession(session.user.id);
    return ok({ success: true });
  });
}
