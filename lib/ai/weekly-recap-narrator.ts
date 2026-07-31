import "server-only";

import { aiText, isOpenAIConfigured } from "./openai";
import type { WeeklyCeoRecapData } from "@/lib/email-templates/weekly-ceo-recap";

export async function generateRecapNarrative(
  data: WeeklyCeoRecapData,
): Promise<string> {
  if (!isOpenAIConfigured()) {
    return "No AI narrative available.";
  }

  const conversionRate =
    data.newLeads > 0
      ? ((data.convertedLeads / data.newLeads) * 100).toFixed(1)
      : "0.0";

  const topPerformersList =
    data.topPerformers.length > 0
      ? data.topPerformers
          .slice(0, 3)
          .map((p, i) => `${i + 1}. ${p.name} (${p.score} pts)`)
          .join(", ")
      : "No performers recorded";

  const pipelineBreakdown =
    data.pipelineSummary.length > 0
      ? data.pipelineSummary
          .map((s) => `${s.status}: ${s.count}`)
          .join(", ")
      : "No pipeline data";

  const system = `You are an executive business analyst writing concise weekly performance narratives for a CEO of an Indian investment and financial services firm.
Your writing style is professional, confident, and insight-driven — not just descriptive.
Highlight what matters most, flag any concerns worth attention, and frame numbers in context.
Write in plain text only (no markdown, no bullet points, no headers).
Output exactly 3 to 4 paragraphs separated by a single blank line.`;

  const user = `Write a weekly performance narrative for ${data.orgName} covering the week of ${data.weekRange}.

Key metrics:
- Total active employees: ${data.totalEmployees}
- New leads this week: ${data.newLeads}
- Leads converted this week: ${data.convertedLeads} (${conversionRate}% of new leads this week)
- Sales activities logged: ${data.totalActivities}
- Open tickets: ${data.openTickets}
- Tickets closed this week: ${data.closedTickets}
- Pending leave requests: ${data.pendingLeaves}

Top performers (by conversions): ${topPerformersList}

Lead pipeline breakdown: ${pipelineBreakdown}

Focus on: overall business momentum, sales team effectiveness, operational health, and any areas requiring the CEO's immediate attention.`;

  return aiText({
    model: "fast",
    system,
    user,
    temperature: 0.5,
  });
}
