import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reimbursements } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  category: z.string().min(1).max(100),
  amount: z.number().positive(),
  description: z.string().max(1000).optional(),
  receiptUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const conditions = [eq(reimbursements.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(reimbursements.userId, session.user.id));

    const data = await db.query.reimbursements.findMany({
      where: and(...conditions),
      with: { user: true },
      orderBy: [desc(reimbursements.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createSchema.parse(await req.json());
    const [record] = await db.insert(reimbursements).values({
      orgId: session.orgId,
      userId: session.user.id,
      category: body.category,
      amount: body.amount.toString(),
      description: body.description,
      receiptUrl: body.receiptUrl || undefined,
      status: "PENDING",
    }).returning();
    return ok(record, 201);
  });
}
