
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChip } from "@/components/ui/icon-chip";
import { Badge } from "@/components/ui/badge";
import { FolderKanban } from "lucide-react";
import Link from "next/link";

interface ProjectStats {
    todo: number;
    inProgress: number;
    done: number;
}

interface ProjectItem {
    id: number;
    name: string;
    role: string | null;
    description: string | null;
    stats?: ProjectStats;
}

export function EmployeeProjectsList({ projects }: { projects: ProjectItem[] }) {
    if (!projects || projects.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-foreground">Projects</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmptyState
                        compact
                        icon={FolderKanban}
                        title="No active projects found for this employee."
                    />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">Active Projects</h3>
                <Badge variant="secondary" className="tabular-nums">
                    {projects.length}
                </Badge>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {projects.map((item) => (
                    <Link key={item.id} href={`/projects/${item.id}`} className="group block rounded-lg outline-none focus-visible:focus-ring">
                        <Card interactive className="h-full">
                            <CardContent className="p-4 flex flex-col h-full">

                                <div className="flex items-start gap-3 mb-3">
                                    <IconChip icon={FolderKanban} />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-sm text-foreground group-hover:text-brand-text transition-colors truncate">
                                            {item.name}
                                        </h4>
                                        <Badge
                                            variant="secondary"
                                            className="mt-1"
                                        >
                                            {item.role || 'MEMBER'}
                                        </Badge>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">
                                    {item.description || "No description provided."}
                                </p>

                                <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-3">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-2xs text-muted-foreground uppercase tracking-wide">
                                            To Do
                                        </span>
                                        <span className="text-sm font-bold tabular-nums text-foreground">
                                            {item.stats?.todo || 0}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-2xs text-muted-foreground uppercase tracking-wide">
                                            In Progress
                                        </span>
                                        <span className="text-sm font-bold tabular-nums text-info-strong">
                                            {item.stats?.inProgress || 0}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-2xs text-muted-foreground uppercase tracking-wide">
                                            Done
                                        </span>
                                        <span className="text-sm font-bold tabular-nums text-success-strong">
                                            {item.stats?.done || 0}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}

