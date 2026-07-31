import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden">

      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm px-4 sm:px-6 lg:px-8 pt-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>

        <Skeleton className="h-2 w-full rounded-full" />

        <div className="flex items-center gap-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-initial">
              <div className="flex flex-col items-center gap-1 px-1.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-2.5 w-16 hidden sm:block" />
              </div>
              {i < 3 && <Skeleton className="flex-1 h-0.5 mx-1 mt-[-0.75rem] hidden sm:block" />}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <Card className="shadow-sm">
            <CardContent className="pt-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Skeleton className="h-9 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
