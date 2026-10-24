import { redirect } from "next/navigation";

/** /tools is the breadcrumb parent of its one tool; it had no page (R3-INV-03). */
export default function ToolsPage() {
  redirect("/tools/qr-code");
}
