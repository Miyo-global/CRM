import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp, sendSms, sendWhatsAppWithSmsFallback } from "@/lib/twilio";
import { z } from "zod";
import type { NextRequest } from "next/server";

const dispatchSchema = z.object({
  
  email: z.string().email().optional(),
  
  phone: z.string().optional(),
  
  subject: z.string().min(1),
  
  body: z.string().min(1),
  
  channels: z
    .array(z.enum(["email", "sms", "whatsapp"]))
    .min(1)
    .default(["email"]),
  
  whatsappSmsFallback: z.boolean().default(true),
});

type ChannelResult = {
  channel: "email" | "sms" | "whatsapp";
  sent: boolean;
  sid?: string;
  reason?: string;
};

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }

    let body: z.infer<typeof dispatchSchema>;
    try {
      body = await parseBody(req, dispatchSchema);
    } catch {
      return err("Invalid request body", 400);
    }
    const results: ChannelResult[] = [];

    for (const channel of body.channels) {
      if (channel === "email") {
        if (!body.email) {
          results.push({ channel: "email", sent: false, reason: "no_email_address" });
          continue;
        }
        try {
          await sendEmail({ to: body.email, subject: body.subject, html: body.body });
          results.push({ channel: "email", sent: true });
        } catch (e) {
          results.push({
            channel: "email",
            sent: false,
            reason: e instanceof Error ? e.message : "unknown_error",
          });
        }
        continue;
      }

      if (!body.phone) {
        results.push({ channel, sent: false, reason: "no_phone_number" });
        continue;
      }

      if (channel === "whatsapp") {
        if (body.whatsappSmsFallback) {
          const result = await sendWhatsAppWithSmsFallback(body.phone, body.body);
          if (result.channel === "whatsapp") {
            results.push({ channel: "whatsapp", sent: true, sid: result.sid });
          } else if (result.channel === "sms") {
            results.push({ channel: "whatsapp", sent: false, reason: "fell_back_to_sms" });
            results.push({ channel: "sms", sent: true, sid: result.sid });
          } else {
            results.push({ channel: "whatsapp", sent: false, reason: "all_channels_failed" });
          }
        } else {
          const result = await sendWhatsApp(body.phone, body.body);
          results.push({ channel: "whatsapp", sent: result.sent, sid: result.sid, reason: result.reason });
        }
        continue;
      }

      if (channel === "sms") {
        const result = await sendSms(body.phone, body.body);
        results.push({ channel: "sms", sent: result.sent, sid: result.sid, reason: result.reason });
      }
    }

    const allFailed = results.every((r) => !r.sent);

    return ok({ results, allFailed });
  });
}
