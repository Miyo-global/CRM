import { isAIConfigured } from "@/lib/ai/openai";
import { AI_MODULE_ENABLED } from "@/lib/constants/modules";
import { AiSettingsClient } from "./ai-settings-client";

/**
 * The flags only matter when the workspace has AI at all (module on and a
 * provider key) — the same check the /ai hub makes. Without it the switches
 * read "on" while every AI surface said "unavailable".
 */
export default function AiSettingsPage() {
  return <AiSettingsClient aiAvailable={AI_MODULE_ENABLED && isAIConfigured()} />;
}
