import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { users, richDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";

const schema = z.object({
  userId: z.string().min(1),
  relievingDate: z.string().min(1),
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can generate experience letters.", 403);

    const body = schema.parse(await req.json());
    const employee = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
    });
    if (!employee) return err("Employee not found.", 404);

    const name = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || employee.name || "Employee";
    const joiningDate = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString(DEFAULT_LOCALE, { year: "numeric", month: "long", day: "numeric" }) : "N/A";
    const relievingDate = new Date(body.relievingDate).toLocaleDateString(DEFAULT_LOCALE, { year: "numeric", month: "long", day: "numeric" });

    const content = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Experience Certificate" }] },
        { type: "paragraph", content: [{ type: "text", text: `Date: ${new Date().toLocaleDateString(DEFAULT_LOCALE, { year: "numeric", month: "long", day: "numeric" })}` }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "To Whom It May Concern," }] },
        { type: "paragraph", content: [{ type: "text", text: `This is to certify that ${name} was employed with our organization from ${joiningDate} to ${relievingDate} as ${employee.designation ?? "a team member"}.` }] },
        { type: "paragraph", content: [{ type: "text", text: `During their tenure, ${name} demonstrated professionalism, dedication, and a strong work ethic. They were responsible for their duties in the ${employee.role} department and consistently delivered quality work.` }] },
        { type: "paragraph", content: [{ type: "text", text: `We wish ${name} all the best in their future endeavors.` }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "Sincerely," }] },
        { type: "paragraph", content: [{ type: "text", marks: [{ type: "bold" }], text: "HR Department" }] },
      ],
    };

    const [doc] = await db.insert(richDocuments).values({
      orgId: session.orgId,
      title: `Experience Certificate - ${name}`,
      contentJson: content,
      templateType: "experience_letter",
      isPublished: false,
      version: 1,
      createdBy: session.user.id,
    }).returning();

    return ok({ documentId: doc.id, title: doc.title }, 201);
  });
}
