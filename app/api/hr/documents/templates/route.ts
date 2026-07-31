import { withAuth, withAdmin, ok, err, parseQuery, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documentTemplates } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { extractVariables } from "@/lib/utils/document-variables";
import { findActiveTemplateDuplicate } from "@/lib/hr/document-template-uniqueness";
import { richDocumentTitleSchema } from "@/lib/validations/hr-documents";
import type { NextRequest } from "next/server";

const listSchema = z.object({
  type: z.string().optional(),
});

const createSchema = z.object({
  title: richDocumentTitleSchema,
  type: z.string().min(1, "Type is required").default("OFFER"),
  htmlContent: z.string().default(""),
  variables: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { type } = parseQuery(req, listSchema);

    const conditions = [
      eq(documentTemplates.orgId, session.orgId),
      eq(documentTemplates.isActive, true),
    ];
    if (type) conditions.push(eq(documentTemplates.type, type));

    const data = await db
      .select()
      .from(documentTemplates)
      .where(and(...conditions))
      .orderBy(desc(documentTemplates.createdAt));

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, createSchema);

    const duplicate = await findActiveTemplateDuplicate(
      session.orgId,
      body.title,
      body.type,
    );
    if (duplicate) {
      return err(
        "A template with this title and type already exists. Use a different title or deactivate the existing template.",
        409,
      );
    }

    const variables = body.variables ?? extractVariables(body.htmlContent);

    const [template] = await db
      .insert(documentTemplates)
      .values({
        orgId: session.orgId,
        title: body.title,
        type: body.type,
        htmlContent: body.htmlContent,
        variables,
        createdBy: session.user.id,
      })
      .returning();

    if (!template) return err("Failed to create template", 500);

    return ok(template, 201);
  });
}
