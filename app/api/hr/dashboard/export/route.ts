import { type NextRequest, NextResponse } from "next/server";
import { withAuth, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users, departments, departmentMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(",");
}


export async function GET(_req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (!role || !["CEO", "ADMIN", "HR", "BRANCH_HR"].includes(role)) {
      return err("Forbidden", 403);
    }

    const rows = await db
      .select({
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        joinedAt: organizationMembers.joinedAt,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        gender: users.gender,
        dateOfBirth: users.dateOfBirth,
        joiningDate: users.joiningDate,
        taxId: users.taxId,
        departmentName: departments.name,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .leftJoin(departmentMembers, eq(departmentMembers.userId, organizationMembers.userId))
      .leftJoin(departments, eq(departments.id, departmentMembers.departmentId))
      .where(eq(organizationMembers.orgId, session.orgId));

    const header = toRow([
      "Employee ID",
      "First Name",
      "Last Name",
      "Email",
      "Role",
      "Department",
      "Gender",
      "Date of Birth",
      "Joining Date",
      "Tax ID",
      "CRM Joined At",
    ]);

    const lines = rows.map((r) =>
      toRow([
        r.userId,
        r.firstName ?? "",
        r.lastName ?? (r.name ?? ""),
        r.email,
        r.role,
        r.departmentName ?? "",
        r.gender ?? "",
        r.dateOfBirth ?? "",
        r.joiningDate ?? "",
        r.taxId ?? "",
        r.joinedAt ? new Date(r.joinedAt).toISOString().slice(0, 10) : "",
      ]),
    );

    const csv = [header, ...lines].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hr-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  });
}
