import { withHrEmailTemplateAccess, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { offerLetterTemplates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  body: z.string().min(1, "Body is required"),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  variables: z.array(z.string()).optional(),
  documentType: z.string().optional().default("OFFER_LETTER"),
  showSignatureBlock: z.boolean().optional().default(false),
});

export async function GET() {
  return withHrEmailTemplateAccess(async (session) => {
    const data = await db
      .select()
      .from(offerLetterTemplates)
      .where(eq(offerLetterTemplates.orgId, session.orgId))
      .orderBy(desc(offerLetterTemplates.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withHrEmailTemplateAccess(async (session) => {
    const body = createSchema.parse(await req.json());

    const [record] = await db.transaction(async (tx) => {
      if (body.isDefault) {
        await tx
          .update(offerLetterTemplates)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(offerLetterTemplates.orgId, session.orgId));
      }

      return tx
        .insert(offerLetterTemplates)
        .values({
          orgId: session.orgId,
          name: body.name,
          body: body.body,
          description: body.description,
          isDefault: body.isDefault ?? false,
          variables: body.variables ?? null,
          documentType: body.documentType ?? "OFFER_LETTER",
          showSignatureBlock: body.showSignatureBlock ?? false,
          createdBy: session.user.id,
        })
        .returning();
    });

    return ok(record, 201);
  });
}
