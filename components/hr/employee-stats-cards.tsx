
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import type { EmployeeStats, EmployeeAttendanceSummaryData } from "@/types/hr";

export function EmployeeLeaveStats({ stats }: { stats?: EmployeeStats | null }) {
    if (!stats) {
        return (
            <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-border animate-pulse">
                    <CardHeader>
                        <div className="h-4 w-24 bg-muted rounded" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-4 w-3/4 bg-muted rounded" />
                    </CardContent>
                </Card>
                <Card className="border-border animate-pulse">
                    <CardHeader>
                        <div className="h-4 w-32 bg-muted rounded" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-4 w-full bg-muted rounded" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { leaves } = stats;

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-foreground">Leave Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Requests</span>
                        <Badge variant="secondary">{leaves.total}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Approved</span>
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200" variant="outline">
                            {leaves.approved}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Pending</span>
                        <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200" variant="outline">
                            {leaves.pending}
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Rejected</span>
                        <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-200" variant="outline">
                            {leaves.rejected}
                        </Badge>
                    </div>
                    {leaves.total === 0 && (
                        <p className="text-sm text-muted-foreground">No leave requests.</p>
                    )}
                </CardContent>
            </Card>

            <Card className="border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-foreground">Leave by Type</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Object.entries(leaves.byType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground capitalize">{type.toLowerCase().replace("_", " ")}</span>
                            <Badge variant="secondary">{count}</Badge>
                        </div>
                    ))}
                    {Object.keys(leaves.byType).length === 0 && (
                        <p className="text-sm text-muted-foreground">No leave types recorded.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export function EmployeeAttendanceSummary({ attendance }: { attendance?: EmployeeAttendanceSummaryData | null }) {
    if (!attendance) return null;

    return (
        <Card className="border-border">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-foreground">Attendance (Current Month)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="flex flex-col items-center p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                        <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{attendance.daysPresent}</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-500 mb-1">Present</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <div className="flex flex-col items-center p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/50">
                        <span className="text-2xl font-bold text-red-700 dark:text-red-400">{attendance.daysAbsent}</span>
                        <span className="text-xs text-red-600 dark:text-red-500 mb-1">Absent</span>
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                    </div>
                    <div className="flex flex-col items-center p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/50">
                        <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">{attendance.daysLate}</span>
                        <span className="text-xs text-amber-600 dark:text-amber-500 mb-1">Late</span>
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div className="flex flex-col items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
                        <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">{attendance.totalHours}</span>
                        <span className="text-xs text-blue-600 dark:text-blue-500 mb-1">Total Hrs</span>
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-500" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
