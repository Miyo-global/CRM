import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hashToken } from "@/lib/secret-crypto";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return err("Token is required", 400);

  const tokenRecord = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, hashToken(token)),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
  });

  if (!tokenRecord) return err("Invalid or expired setup link", 400);

  const user = await db.query.users.findFirst({
    where: eq(users.email, tokenRecord.email),
    columns: { name: true, email: true },
  });

  return ok({
    email: tokenRecord.email,
    name: user?.name ?? "New Employee",
  });
}
