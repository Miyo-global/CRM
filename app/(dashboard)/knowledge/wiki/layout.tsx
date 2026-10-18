/**
 * KB-0067: the wiki frame.
 *
 * The sidebar and quick find arrive with WikiShell in KB-0068; until then this
 * is the full-height container every wiki page lays itself out inside.
 */
export default function WikiLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col">{children}</div>;
}
