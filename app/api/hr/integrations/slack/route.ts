import { withAdmin, ok, err } from "@/lib/api/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";

const sendSchema = z.object({
  channel: z.string().optional(),
  message: z.string().min(1).max(3000),
  type: z.enum(["LEAVE_APPROVAL", "EXPENSE_APPROVAL", "RESIGNATION", "NEW_HIRE", "CUSTOM"]).optional().default("CUSTOM"),
});

export async function POST(req: NextRequest) {
  return withAdmin(async () => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return err("Slack integration not configured. Set SLACK_WEBHOOK_URL in environment.", 400);
    }

    const body = sendSchema.parse(await req.json());

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: body.channel,
          text: body.message,
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: body.message },
            },
            {
              type: "context",
              elements: [
                { type: "mrkdwn", text: `*Type:* ${body.type} | *Sent via:* Miyo Global HR` },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        return err("Failed to send Slack notification.", 502);
      }

      return ok({ sent: true });
    } catch {
      return err("Slack webhook request failed.", 502);
    }
  });
}
