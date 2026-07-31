import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { csatSurveys } from "@/lib/db/schema/crm";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["sent", "closed"]).optional(),
  title: z.string().min(1).max(200).optional(),
  question: z.string().min(1).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  return withAuth(async (session) => {
    const { surveyId } = await params;
    const survey = await db.query.csatSurveys.findFirst({
      where: and(
        eq(csatSurveys.id, Number(surveyId)),
        eq(csatSurveys.orgId, session.orgId)
      ),
      with: {
        client: { columns: { id: true, name: true } },
        responses: true,
      },
    });

    if (!survey) return err("Survey not found", 404);
    return ok(survey);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  return withAuth(async (session) => {
    const { surveyId } = await params;
    const body = await parseBody(req, patchSchema);

    const existing = await db.query.csatSurveys.findFirst({
      where: and(
        eq(csatSurveys.id, Number(surveyId)),
        eq(csatSurveys.orgId, session.orgId)
      ),
      columns: { id: true },
    });
    if (!existing) return err("Survey not found", 404);

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (body.title !== undefined) updateValues.title = body.title;
    if (body.question !== undefined) updateValues.question = body.question;
    if (body.status === "sent") {
      updateValues.status = "sent";
      updateValues.sentAt = new Date();
    } else if (body.status === "closed") {
      updateValues.status = "closed";
      updateValues.closedAt = new Date();
    }

    const [updated] = await db
      .update(csatSurveys)
      .set(updateValues)
      .where(eq(csatSurveys.id, Number(surveyId)))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  return withAuth(async (session) => {
    const { surveyId } = await params;

    const existing = await db.query.csatSurveys.findFirst({
      where: and(
        eq(csatSurveys.id, Number(surveyId)),
        eq(csatSurveys.orgId, session.orgId)
      ),
      columns: { id: true },
    });
    if (!existing) return err("Survey not found", 404);

    await db.delete(csatSurveys).where(eq(csatSurveys.id, Number(surveyId)));
    return ok({ success: true });
  });
}
