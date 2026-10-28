import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mx-auto w-full max-w-[1440px] px-4 lg:px-6 pt-4 pb-10">
        <TableSkeleton />
      </div>
    </>
  );
}
