import { PageHeaderSkeleton, BoardSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <PageHeaderSkeleton />
      <div className="min-h-0 flex-1 mx-auto w-full max-w-[1440px] px-4 lg:px-6 pt-4 pb-4">
        <BoardSkeleton />
      </div>
    </div>
  );
}
