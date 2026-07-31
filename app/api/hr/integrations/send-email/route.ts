import { withAuth, ok, err, HR_EMAIL_TEMPLATE_ROLES } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { emailTemplates, candidates, departments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getEmployee } from "@/server/queries/hr";
import { logger } from "@/lib/logger";

const sendSchema = z
  .object({
    to: z.string().email().optional(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(10000),
    templateId: z.number().int().positive().optional(),
    candidateId: z.number().int().positive().optional(),
    employeeUserId: z.string().min(1).optional(),
    mergeDataFromUserId: z.string().min(1).optional(),
    variables: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.to && !val.employeeUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide recipient email (to) or employeeUserId",
        path: ["to"],
      });
    }
    if (val.mergeDataFromUserId && !val.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "mergeDataFromUserId requires to (recipient email)",
        path: ["to"],
      });
    }
    if (val.employeeUserId && val.mergeDataFromUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use employeeUserId OR mergeDataFromUserId, not both",
        path: ["mergeDataFromUserId"],
      });
    }
    if (val.candidateId != null && val.employeeUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either candidateId or employeeUserId, not both",
        path: ["employeeUserId"],
      });
    }
    if (val.candidateId != null && val.mergeDataFromUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use either candidateId or mergeDataFromUserId, not both",
        path: ["mergeDataFromUserId"],
      });
    }
  });

export function replaceTemplateVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return vars[key] ?? "";
  });
}

function withEmployeeFieldAliases(vars: Record<string, string>): Record<string, string> {
  const display = vars.name ?? "";
  return {
    ...vars,
    employee_name: vars.employee_name ?? display,
    employeeName: vars.employeeName ?? display,
    full_name: vars.full_name ?? display,
    fullName: vars.fullName ?? display,
  };
}

function buildEmployeeAutoVars(
  employee: NonNullable<Awaited<ReturnType<typeof getEmployee>>>,
  departmentName: string
): Record<string, string> {
  const today = new Date();
  const displayName =
    employee.name?.trim() ||
    [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() ||
    employee.email;

  return withEmployeeFieldAliases({
    name: displayName,
    firstName: employee.firstName ?? "",
    lastName: employee.lastName ?? "",
    email: employee.email,
    employeeCode: employee.employeeId ?? "",
    designation: employee.designation ?? "",
    department: departmentName,
    joiningDate: employee.joiningDate ? String(employee.joiningDate) : "",
    phone: employee.phone ?? "",
    date: today.toLocaleDateString(undefined, { dateStyle: "long" }),
    today: today.toISOString().slice(0, 10),
  });
}

async function departmentNameForEmployee(
  orgId: string,
  departmentId: number | null
): Promise<string> {
  if (departmentId == null) return "";
  const dept = await db.query.departments.findFirst({
    where: and(eq(departments.id, departmentId), eq(departments.orgId, orgId)),
  });
  return dept?.name ?? "";
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!role || !HR_EMAIL_TEMPLATE_ROLES.has(role)) {
      return err("You do not have permission to send HR template emails.", 403);
    }

    if (!process.env.SENDGRID_API_KEY?.trim()) {
      return err(
        "Email not configured. Set SENDGRID_API_KEY (and EMAIL_FROM_ADDRESS or SENDGRID_FROM_EMAIL for the From address).",
        400
      );
    }

    const body = sendSchema.parse(await req.json());
    let subject = body.subject;
    let emailBody = body.body;

    if (body.templateId) {
      const template = await db.query.emailTemplates.findFirst({
        where: and(eq(emailTemplates.id, body.templateId), eq(emailTemplates.orgId, session.orgId)),
      });
      if (template) {
        subject = template.subject;
        emailBody = template.body;
      }
    }

    let autoVars: Record<string, string> = {};

    if (body.candidateId) {
      const candidate = await db.query.candidates.findFirst({
        where: and(eq(candidates.id, body.candidateId), eq(candidates.orgId, session.orgId)),
      });
      if (candidate) {
        const full = `${candidate.firstName} ${candidate.lastName}`;
        autoVars = {
          candidateName: full,
          candidateEmail: candidate.email,
          candidateFirstName: candidate.firstName,
          candidateLastName: candidate.lastName,
          candidate_name: full,
        };
      }
    } else if (body.employeeUserId) {
      const employee = await getEmployee(session.orgId, body.employeeUserId);
      if (!employee) {
        return err("Employee not found in this organization.", 404);
      }
      const deptName = await departmentNameForEmployee(session.orgId, employee.departmentId);
      autoVars = buildEmployeeAutoVars(employee, deptName);
    } else if (body.mergeDataFromUserId) {
      const employee = await getEmployee(session.orgId, body.mergeDataFromUserId);
      if (!employee) {
        return err("Employee not found in this organization.", 404);
      }
      const deptName = await departmentNameForEmployee(session.orgId, employee.departmentId);
      autoVars = buildEmployeeAutoVars(employee, deptName);
    }

    const manualVars = Object.fromEntries(
      Object.entries(body.variables ?? {}).map(([k, v]) => [k, String(v)])
    );
    const merged = { ...autoVars, ...manualVars };
    subject = replaceTemplateVariables(subject, merged);
    emailBody = replaceTemplateVariables(emailBody, merged);

    const toAddress =
      body.employeeUserId && merged.email ? merged.email : (body.to as string);

    try {
      const { sendEmail } = await import("@/lib/email/sender");
      await sendEmail({
        to: toAddress,
        subject,
        html: emailBody,
      });
      return ok({ sent: true, to: toAddress, subject });
    } catch (e) {
      logger.error("Failed to send HR template email", e);
      return err("Failed to send email. Please try again.", 502);
    }
  });
}
