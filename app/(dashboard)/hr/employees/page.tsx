import { redirect } from "next/navigation";

// /hr is the employee directory (table-first, with a grid toggle). This route
// used to render a second, card-first copy of the same list with its own
// filters and no pagination (A43, B6). Kept as a redirect so existing links
// and bookmarks still land on the directory.
export default function EmployeesPage() {
  redirect("/hr");
}
