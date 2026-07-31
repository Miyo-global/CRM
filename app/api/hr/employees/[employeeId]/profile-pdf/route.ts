
import { withAuth, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { escapeHtml } from "@/lib/email-templates/base";
import { getEmployee } from "@/server/queries/hr";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

type Params = { params: Promise<{ employeeId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }

    const { employeeId } = await params;
    const employee = await getEmployee(session.orgId, employeeId);
    if (!employee) return err("Employee not found", 404);

    const name = escapeHtml(
      employee.name ?? (`${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Employee")
    );
    const joinDate = employee.joiningDate
      ? format(new Date(employee.joiningDate), "dd MMM yyyy")
      : "";

    const designation = employee.designation ? escapeHtml(String(employee.designation)) : "";
    const email = employee.email ? escapeHtml(String(employee.email)) : "";
    const phone = employee.phone ? escapeHtml(String(employee.phone)) : "";
    const linkedinUrl = employee.linkedinUrl ? escapeHtml(String(employee.linkedinUrl)) : "";
    const empId = escapeHtml(String(employee.employeeId ?? employee.id ?? ""));
    const empRole = employee.role ? escapeHtml(String(employee.role)) : "";
    const reportingTo = employee.reportingTo ? escapeHtml(String(employee.reportingTo)) : "";
    const monthlySalary = employee.monthlySalary
      ? `₹${escapeHtml(String(employee.monthlySalary))}`
      : "";
    const bio = employee.bio ? escapeHtml(String(employee.bio)) : "";

    const skillsList =
      Array.isArray(employee.skills) && employee.skills.length > 0
        ? employee.skills
            .map((s: string) => `<span class="badge">${escapeHtml(String(s))}</span>`)
            .join(" ")
        : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Employee Profile — ${name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 14px; color: #111; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; color: #0f2b7f; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #666; margin-bottom: 24px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #bd882c; margin-bottom: 8px; margin-top: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 8px; }
    .field-label { font-size: 11px; color: #888; margin-bottom: 2px; }
    .field-value { font-size: 13px; color: #111; }
    .badge { display: inline-block; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 8px; font-size: 12px; color: #374151; margin-right: 4px; }
    .bio { font-size: 13px; color: #444; line-height: 1.6; white-space: pre-wrap; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <div class="subtitle">${designation} · ${email}</div>

  <div class="section-title">Personal Information</div>
  <div class="grid">
    <div>
      <div class="field-label">Employee ID</div>
      <div class="field-value">${empId}</div>
    </div>
    <div>
      <div class="field-label">Email</div>
      <div class="field-value">${email}</div>
    </div>
    <div>
      <div class="field-label">Phone</div>
      <div class="field-value">${phone}</div>
    </div>
    <div>
      <div class="field-label">LinkedIn</div>
      <div class="field-value">${linkedinUrl}</div>
    </div>
  </div>

  <div class="section-title">Employment Details</div>
  <div class="grid">
    <div>
      <div class="field-label">Role</div>
      <div class="field-value">${empRole}</div>
    </div>
    <div>
      <div class="field-label">Designation</div>
      <div class="field-value">${designation}</div>
    </div>
    <div>
      <div class="field-label">Joining Date</div>
      <div class="field-value">${joinDate}</div>
    </div>
    <div>
      <div class="field-label">Status</div>
      <div class="field-value">${employee.isActive ? "Active" : "Inactive"}</div>
    </div>
    <div>
      <div class="field-label">Monthly Salary</div>
      <div class="field-value">${monthlySalary}</div>
    </div>
    <div>
      <div class="field-label">Reports To</div>
      <div class="field-value">${reportingTo}</div>
    </div>
  </div>

  ${
    bio
      ? `<div class="section-title">Bio</div><div class="bio">${bio}</div>`
      : ""
  }

  <div class="section-title">Skills</div>
  <div>${skillsList}</div>

  <div style="margin-top:32px;font-size:11px;color:#aaa;border-top:1px solid #e5e7eb;padding-top:12px;">
    Generated on ${format(new Date(), "dd MMM yyyy HH:mm")} — Confidential HR Record
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="employee-profile-${employeeId}.html"`,
      },
    });
  });
}
