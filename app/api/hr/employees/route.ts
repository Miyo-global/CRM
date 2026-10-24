import { withAuth, ok } from "@/lib/api/helpers";
import { redactSalary } from "@/lib/hr/redact-salary";
import { toDirectoryEntry, toPickerEntry } from "@/lib/hr/directory-view";
import { getEmployees, getEmployeesPaginated } from "@/server/queries/hr";
import { clampPageSize, DEFAULT_PAGE_SIZE } from "@/lib/pagination-constants";
import type { EmployeeListFilters } from "@/server/queries/hr/employees";
import type { NextRequest } from "next/server";
import type { Employee, PaginatedEmployees } from "@/types/hr";

function mapStatusParam(raw: string | null): "active" | "inactive" | "all" {
  if (raw === "Inactive") return "inactive";
  if (raw === "All") return "all";
  return "active";
}

export async function GET(req: NextRequest) {
  return withAuth<PaginatedEmployees | Employee[]>(async (session) => {
    const { searchParams } = req.nextUrl;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit") ?? searchParams.get("size");
    const search =
      searchParams.get("search") ??
      searchParams.get("q") ??
      undefined;
    const dept = searchParams.get("dept") ?? undefined;
    const role = searchParams.get("role") ?? undefined;
    const status = searchParams.get("status");
    // Pickers ask for ?fields=picker and get {id, name, image, department...}
    // only, whatever the viewer's role (R3-NET-01).
    const shape = (row: Employee) =>
      (searchParams.get("fields") === "picker"
        ? toPickerEntry(row, session.user)
        : toDirectoryEntry(redactSalary(row, session.user), session.user)) as Employee;

    const wantsPaginated =
      page != null ||
      limit != null ||
      search != null ||
      (dept != null && dept !== "All") ||
      (role != null && role !== "All") ||
      (status != null && status !== "Active");

    if (wantsPaginated) {
      const listFilters: EmployeeListFilters = {
        search,
        departmentName: dept,
        role,
        status: mapStatusParam(status),
      };
      const data = await getEmployeesPaginated(
        session.orgId,
        page ? Number(page) : 1,
        limit ? clampPageSize(Number(limit)) : DEFAULT_PAGE_SIZE,
        listFilters,
      );
      return ok({
        ...data,
        // Non-admins get a directory card, not the HR record (QA-0062).
        data: data.data.map(shape),
      });
    }

    const data = await getEmployees(session.orgId);
    return ok(data.map(shape));
  });
}
