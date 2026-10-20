import { notFound } from "next/navigation";
import { CRM_MODULE_ENABLED } from "@/lib/constants/modules";

// Custom fields only exist for leads, deals and contacts, so the page is CRM
// only. The sidebar already hides it; this stops the URL resolving too.
export default function CustomFieldsLayout({ children }: { children: React.ReactNode }) {
  if (!CRM_MODULE_ENABLED) notFound();
  return children;
}
