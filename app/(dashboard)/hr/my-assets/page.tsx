"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { MyAssignedAssetsView } from "@/features/hr/assets/my-assigned-assets-view";

export default function MyAssetsPage() {
  const router = useRouter();

  const handleGoBack = useCallback(() => {
    if (typeof window === "undefined") {
      router.push("/dashboard");
      return;
    }
    const keyBefore = `${window.location.pathname}${window.location.search}`;
    router.back();
    window.setTimeout(() => {
      const keyAfter = `${window.location.pathname}${window.location.search}`;
      if (keyAfter === keyBefore) {
        router.push("/dashboard");
      }
    }, 200);
  }, [router]);

  return (
    <PageWrapper
      title="My Assets"
      subtitle="Company equipment currently assigned to you"
      actions={
        <Button variant="ghost" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Back
        </Button>
      }
    >
      <MyAssignedAssetsView />
    </PageWrapper>
  );
}
