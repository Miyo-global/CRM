import { PageTree } from "@/features/knowledge/components/page-tree";
import { WikiShell } from "@/features/knowledge/components/wiki-shell";

/**
 * KB-0067, KB-0068, KB-0069: the wiki frame — the sidebar, quick find, the
 * page tree and Trash around every wiki page.
 */
export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return <WikiShell tree={<PageTree canEdit />}>{children}</WikiShell>;
}
