import { eq, isNull, or } from "drizzle-orm";
import { appraisalCategories } from "@/lib/db/schema";

/** An org sees its own categories plus the global defaults (org_id NULL, drizzle/0196). */
export function categoriesVisibleTo(orgId: string) {
  return or(eq(appraisalCategories.orgId, orgId), isNull(appraisalCategories.orgId));
}

/** "Goals & KPI Achievement" -> "goals_kpi_achievement". Empty for a name with no letters/digits. */
export function slugifyCategoryName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}
