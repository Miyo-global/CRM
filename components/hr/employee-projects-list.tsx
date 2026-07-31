
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <Card className="border-dashed shadow-none border-border">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-foreground">Projects</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center mb-3">
                            <FolderKanban className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm">No active projects found for this employee.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">Active Projects</h3>
                <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                    {projects.length}
                </Badge>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {projects.map((item) => (
                    <Link key={item.id} href={`/projects/${item.id}`} className="block group">
                        <Card className="h-full border-border hover:border-primary/50 hover:shadow-md transition-all duration-200">
                            <CardContent className="p-4 flex flex-col h-full">

                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                                        <FolderKanban className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                            {item.name}
                                        </h4>
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] mt-1 bg-muted text-muted-foreground font-medium"
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
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                            To Do
                                        </span>
                                        <span className="font-bold text-sm text-foreground">
                                            {item.stats?.todo || 0}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                            In Progress
                                        </span>
                                        <span className="font-bold text-sm text-blue-600">
                                            {item.stats?.inProgress || 0}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center gap-0.5">
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                            Done
                                        </span>
                                        <span className="font-bold text-sm text-emerald-600">
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

