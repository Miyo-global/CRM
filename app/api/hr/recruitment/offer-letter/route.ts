import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { candidates, jobPostings, richDocuments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

const schema = z.object({
  candidateId: z.number().int().positive(),
  jobPostingId: z.number().int().positive(),
  salary: z.number().positive().max(1_000_000_000),
  startDate: z.string().date(),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can generate offer letters.", 403);

    const body = schema.parse(await req.json());

    const [candidate, job] = await Promise.all([
      db.query.candidates.findFirst({
        where: and(eq(candidates.id, body.candidateId), eq(candidates.orgId, session.orgId)),
      }),
      db.query.jobPostings.findFirst({
        where: and(eq(jobPostings.id, body.jobPostingId), eq(jobPostings.orgId, session.orgId)),
      }),
    ]);

    if (!candidate) return err("Candidate not found.", 404);
    if (!job) return err("Job posting not found.", 404);

    const candidateName = `${candidate.firstName} ${candidate.lastName}`;
    const formattedStartDate = new Date(`${body.startDate}T00:00:00`).toLocaleDateString(DEFAULT_LOCALE, { year: "numeric", month: "long", day: "numeric" });
    const formattedSalary = body.salary.toLocaleString(DEFAULT_LOCALE);
    const content = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Offer Letter" }] },
        { type: "paragraph", content: [{ type: "text", text: `Date: ${new Date().toLocaleDateString(DEFAULT_LOCALE, { year: "numeric", month: "long", day: "numeric" })}` }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: `Dear ${candidateName},` }] },
        { type: "paragraph", content: [{ type: "text", text: `We are pleased to offer you the position of ${job.title} at our organization. Your start date will be ${formattedStartDate}.` }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Compensation" }] },
        { type: "bulletList", content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Annual CTC: ${CURRENCY_SYMBOL}${formattedSalary}` }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Position: ${job.title}` }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Location: ${job.location ?? "As per company policy"}` }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: `Start Date: ${formattedStartDate}` }] }] },
        ]},
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "Please confirm your acceptance by signing below within 7 business days." }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "We look forward to having you on our team!" }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "Best regards," }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "HR Team" }] },
      ],
    };

    const [doc] = await db.insert(richDocuments).values({
      orgId: session.orgId,
      title: `Offer Letter - ${candidateName} - ${job.title}`,
      contentJson: content,
      templateType: "offer_letter",
      isPublished: false,
      version: 1,
      createdBy: session.user.id,
    }).returning();

    return ok({ documentId: doc.id, title: doc.title }, 201);
  });
}
