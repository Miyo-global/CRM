import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { isAIConfigured } from "@/lib/ai/openai";
import { AI_MODULE_ENABLED } from "@/lib/constants/modules";
import { AIHubClient } from "./ai-hub-client";

/**
 * The hub is only rendered when AI is actually usable. Without a provider key
 * it showed every tool plus the server env-var name (QA-0003); it now shows a
 * neutral unavailable state and no configuration detail.
 */
export default function AIHubPage() {
  if (!AI_MODULE_ENABLED || !isAIConfigured()) {
    return (
      <PageWrapper title="AI hub">
        <EmptyState
          title="AI features are unavailable"
          description="AI tools are not enabled for this workspace. Contact your administrator if you need them."
        />
      </PageWrapper>
    );
  }
  return <AIHubClient />;
}
