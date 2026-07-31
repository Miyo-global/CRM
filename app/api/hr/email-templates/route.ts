import { withHrEmailTemplateAccess, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import {
  TEMPLATE_NAME_MIN,
  TEMPLATE_NAME_MAX,
  TEMPLATE_SUBJECT_MIN,
  TEMPLATE_SUBJECT_MAX,
  TEMPLATE_BODY_MIN,
  TEMPLATE_BODY_MAX,
  TEMPLATE_NAME_ALLOWED,
  TEMPLATE_NAME_ALLOWED_HINT,
} from "@/lib/hr/email-template-validation";

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(TEMPLATE_NAME_MIN, `Name must be at least ${TEMPLATE_NAME_MIN} characters`)
    .max(TEMPLATE_NAME_MAX, `Name must be ${TEMPLATE_NAME_MAX} characters or fewer`)
    .regex(TEMPLATE_NAME_ALLOWED, `Name can only contain ${TEMPLATE_NAME_ALLOWED_HINT}`),
  subject: z
    .string()
    .trim()
    .min(TEMPLATE_SUBJECT_MIN, `Subject must be at least ${TEMPLATE_SUBJECT_MIN} characters`)
    .max(TEMPLATE_SUBJECT_MAX, `Subject must be ${TEMPLATE_SUBJECT_MAX} characters or fewer`),
  body: z
    .string()
    .trim()
    .min(TEMPLATE_BODY_MIN, `Body must be at least ${TEMPLATE_BODY_MIN} characters`)
    .max(TEMPLATE_BODY_MAX, `Body must be ${TEMPLATE_BODY_MAX} characters or fewer`),
  category: z.string().optional(),
  variables: z.array(z.string()).optional(),
});

export async function GET() {
  return withHrEmailTemplateAccess(async (session) => {
    const data = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.orgId, session.orgId))
      .orderBy(desc(emailTemplates.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withHrEmailTemplateAccess(async (session) => {
    const body = createSchema.parse(await req.json());

    const [record] = await db
      .insert(emailTemplates)
      .values({
        orgId: session.orgId,
        name: body.name,
        subject: body.subject,
        body: body.body,
        category: body.category ?? "GENERAL",
        variables: body.variables ?? null,
        createdBy: session.user.id,
      })
      .returning();

    return ok(record, 201);
  });
}
