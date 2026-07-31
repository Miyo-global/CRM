import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  candidateDocuments,
  documentTemplates,
  candidates,
} from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { z } from "zod";
import { substituteVariables } from "@/lib/utils/document-variables";
import { escapeHtml } from "@/lib/email-templates/base";
import { isRecruitmentHr } from "@/lib/constants/roles";
import { sendEmail } from "@/lib/email/sender";
import { appUrl } from "@/lib/app-url";
import { createSigningRequest } from "@/lib/esign/documenso";
import { createAuditLog } from "@/lib/audit-log";
import { inngest } from "@/lib/inngest/client";
import type { NextRequest } from "next/server";

const rolloutSchema = z.object({
  templateIds: z.array(z.number().int().positive()).min(1, "Select at least one template"),
  variables: z.record(z.string(), z.string()).default({}),
  sendEmail: z.boolean().default(true),
  
  acceptanceDeadline: z.string().datetime({ offset: true }).optional(),
});

type Params = { params: Promise<{ candidateId: string }> };


export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    const { candidateId } = await params;
    const candidateIdNum = Number(candidateId);
    if (!Number.isFinite(candidateIdNum)) return err("Invalid candidate ID", 400);

    const [candidate] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(and(eq(candidates.id, candidateIdNum), eq(candidates.orgId, session.orgId)))
      .limit(1);

    if (!candidate) return err("Candidate not found", 404);

    const docs = await db
      .select({
        id: candidateDocuments.id,
        templateId: candidateDocuments.templateId,
        templateTitle: documentTemplates.title,
        title: candidateDocuments.title,
        status: candidateDocuments.status,
        sentAt: candidateDocuments.sentAt,
        viewedAt: candidateDocuments.viewedAt,
        signedAt: candidateDocuments.signedAt,
        declinedAt: candidateDocuments.declinedAt,
        createdAt: candidateDocuments.createdAt,
        createdBy: candidateDocuments.createdBy,
      })
      .from(candidateDocuments)
      .leftJoin(documentTemplates, eq(candidateDocuments.templateId, documentTemplates.id))
      .where(eq(candidateDocuments.candidateId, candidateIdNum))
      .orderBy(desc(candidateDocuments.createdAt));

    return ok(docs);
  });
}


export async function POST(req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    if (!isRecruitmentHr(session.user.role)) {
      return err("Forbidden: HR/Admin role required", 403);
    }

    const { candidateId } = await params;
    const candidateIdNum = Number(candidateId);
    if (!Number.isFinite(candidateIdNum)) return err("Invalid candidate ID", 400);

    const body = await parseBody(req, rolloutSchema);

    const [candidate] = await db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
      })
      .from(candidates)
      .where(and(eq(candidates.id, candidateIdNum), eq(candidates.orgId, session.orgId)))
      .limit(1);

    if (!candidate) return err("Candidate not found", 404);

    const templates = await db
      .select()
      .from(documentTemplates)
      .where(
        and(
          inArray(documentTemplates.id, body.templateIds),
          eq(documentTemplates.orgId, session.orgId),
          eq(documentTemplates.isActive, true)
        )
      );

    if (templates.length === 0) {
      return err("No active templates found for the provided IDs", 404);
    }

    const missingTemplateIds = body.templateIds.filter(
      (id) => !templates.find((t) => t.id === id)
    );
    if (missingTemplateIds.length > 0) {
      return err(
        `Templates not found or inactive: IDs ${missingTemplateIds.join(", ")}`,
        404
      );
    }

    const resolvedTemplates: { templateId: number; title: string; htmlContent: string }[] = [];
    const missingVarErrors: string[] = [];

    for (const template of templates) {
      const { result, missing } = substituteVariables(template.htmlContent, body.variables);

      if (missing.length > 0) {
        missingVarErrors.push(`"${template.title}": missing ${missing.join(", ")}`);
        continue;
      }

      resolvedTemplates.push({ templateId: template.id, title: template.title, htmlContent: result });
    }

    if (missingVarErrors.length > 0) {
      return err(
        `Variable substitution failed for: ${missingVarErrors.join("; ")}`,
        400
      );
    }

    const generatedDocs = await db.transaction(async (tx) => {
      const docs: (typeof candidateDocuments.$inferSelect)[] = [];
      for (const resolved of resolvedTemplates) {
        const [doc] = await tx
          .insert(candidateDocuments)
          .values({
            candidateId: candidateIdNum,
            orgId: session.orgId,
            templateId: resolved.templateId,
            title: resolved.title,
            htmlContent: resolved.htmlContent,
            status: "GENERATED",
            createdBy: session.user.id,
            ...(body.acceptanceDeadline && {
              acceptanceDeadline: new Date(body.acceptanceDeadline),
            }),
          })
          .returning();

        if (doc) docs.push(doc);
      }
      return docs;
    });

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    const webhookUrl = `${appUrl}/api/webhooks/esign`;

    for (const doc of generatedDocs) {
      try {
        const esignResult = await createSigningRequest({
          title: doc.title,
          htmlContent: doc.htmlContent,
          recipients: [{ name: candidateName, email: candidate.email, role: "SIGNER" }],
          redirectUrl: `${appUrl}/careers`,
          webhookUrl,
        });

        if (esignResult.sent) {
          await db
            .update(candidateDocuments)
            .set({ externalDocId: esignResult.externalDocId, updatedAt: new Date() })
            .where(eq(candidateDocuments.id, doc.id));
          doc.externalDocId = esignResult.externalDocId;
        }
      } catch {
      }
    }

    if (body.sendEmail && generatedDocs.length > 0) {
      const documentLinks = generatedDocs
        .map(
          (doc) =>
            `<li><a href="${appUrl}/api/hr/recruitment/candidates/${candidateIdNum}/documents/${doc.id}/view" style="color:#bd882c">${escapeHtml(doc.title)}</a></li>`
        )
        .join("\n");

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#0f2b7f">Your Documents Are Ready</h2>
          <p>Dear ${escapeHtml(candidateName)},</p>
          <p>The following document(s) have been prepared for you as part of your application process:</p>
          <ul style="margin:16px 0;padding-left:24px">
            ${documentLinks}
          </ul>
          <p>Please review and sign the documents at your earliest convenience.</p>
          <p style="color:#666;font-size:12px;margin-top:32px">
            This is an automated message from Miyo Global HR system.
          </p>
        </div>
      `;

      try {
        await sendEmail({
          to: candidate.email,
          subject: "Your Documents Are Ready — Please Review",
          html: emailHtml,
        });

        const docIds = generatedDocs.map((d) => d.id);
        await db
          .update(candidateDocuments)
          .set({ status: "SENT", sentAt: new Date() })
          .where(inArray(candidateDocuments.id, docIds));

        for (const doc of generatedDocs) {
          doc.status = "SENT";
          doc.sentAt = new Date();
        }
      } catch {
      }
    }

    await createAuditLog({
      action: "document.generated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(candidateIdNum),
      targetType: "candidate",
      metadata: {
        documentCount: generatedDocs.length,
        documentIds: generatedDocs.map((d) => d.id),
        templateIds: body.templateIds,
        emailSent: body.sendEmail,
      },
    });

    if (body.acceptanceDeadline && generatedDocs.length > 0) {
      const deadlineMs = new Date(body.acceptanceDeadline).getTime();
      const reminderMs = deadlineMs - 24 * 60 * 60 * 1000;
      if (reminderMs > Date.now()) {
        void inngest
          .send({
            name: "hr/offer.deadline.reminder",
            data: {
              candidateId: candidateIdNum,
              candidateName: `${candidate.firstName} ${candidate.lastName}`,
              candidateEmail: candidate.email,
              documentIds: generatedDocs.map((d) => d.id),
              deadline: body.acceptanceDeadline,
              orgId: session.orgId,
            },
            ts: reminderMs,
          })
          .catch(() => undefined);
      }
    }

    return ok({ documents: generatedDocs, count: generatedDocs.length }, 201);
  });
}
