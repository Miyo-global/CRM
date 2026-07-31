"use client";

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const HashIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
);
const PanelLeftOpenIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg>
);
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
import { EmptyMailIllustration } from "@/components/illustrations";

export function EmptyChatState({
  onNewDM,
  onNewChannel,
  onSearch,
  onExpandSidebar,
}: {
  onNewDM: () => void;
  onNewChannel: () => void;
  onSearch: () => void;
  onExpandSidebar?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 relative">
      {onExpandSidebar && (
        <button
          onClick={onExpandSidebar}
          className="absolute top-3 left-3 hidden md:flex h-8 w-8 rounded-lg bg-muted/80 hover:bg-muted items-center justify-center text-muted-foreground hover:text-foreground transition-colors border border-border/50"
          aria-label="Open conversations"
        >
          <PanelLeftOpenIcon className="h-4 w-4" />
        </button>
      )}
      <EmptyMailIllustration className="mb-6 w-44 h-44" />
      <h3 className="text-lg font-bold mb-1">Welcome to Chat</h3>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
        Select a conversation or start a new one.
      </p>
      <div className="flex items-center gap-6 mt-5">
        <button onClick={onNewDM} className="flex flex-col items-center gap-1.5 group">
          <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-gold/10 group-hover:text-gold text-muted-foreground transition-colors">
            <PlusIcon className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">New DM</span>
        </button>
        <button onClick={onNewChannel} className="flex flex-col items-center gap-1.5 group">
          <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-gold/10 group-hover:text-gold text-muted-foreground transition-colors">
            <HashIcon className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Channel</span>
        </button>
        <button onClick={onSearch} className="flex flex-col items-center gap-1.5 group">
          <div className="h-10 w-10 rounded-xl bg-muted/40 flex items-center justify-center group-hover:bg-gold/10 group-hover:text-gold text-muted-foreground transition-colors">
            <SearchIcon className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">Search</span>
        </button>
      </div>
    </div>
  );
}
