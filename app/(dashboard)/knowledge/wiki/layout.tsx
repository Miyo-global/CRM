import { WikiShell } from "@/features/knowledge/components/wiki-shell";

/**
 * KB-0067, KB-0068: the wiki frame — the sidebar, quick find and Trash around
 * every wiki page. The page tree arrives in KB-0069.
 */
export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return <WikiShell>{children}</WikiShell>;
}
