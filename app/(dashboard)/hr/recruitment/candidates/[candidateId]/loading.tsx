import { DetailSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="px-4 sm:px-6 xl:px-8 pt-6 pb-10">
      <DetailSkeleton />
    </div>
  );
}
