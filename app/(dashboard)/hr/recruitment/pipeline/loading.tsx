import { PageHeaderSkeleton, BoardSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <PageHeaderSkeleton />
      <div className="min-h-0 flex-1 px-4 sm:px-6 xl:px-8 pt-4 pb-4">
        <BoardSkeleton />
      </div>
    </div>
  );
}
