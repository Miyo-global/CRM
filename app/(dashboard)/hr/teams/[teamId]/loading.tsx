import { DetailSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 lg:px-6 pt-6 pb-10">
      <DetailSkeleton />
    </div>
  );
}
