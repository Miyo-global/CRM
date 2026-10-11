import { PageHeaderSkeleton, ChartGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="px-4 sm:px-6 xl:px-8 pt-4 pb-10">
        <ChartGridSkeleton />
      </div>
    </>
  );
}
