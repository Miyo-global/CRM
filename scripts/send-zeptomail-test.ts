/**
 * End-to-end smoke test for the outbound mail transport.
 *
 * Prints the resolved configuration, then sends one real email through
 * whichever provider EMAIL_PROVIDER selects (ZeptoMail by default).
 *
 *   pnpm send:mail-test              # print config and send
 *   pnpm send:mail-test -- --check   # print config only, send nothing
 *
 * Requires TEST_EMAIL_TO in .env.
 */
import { sendEmail } from "@/lib/email/sender";
import {
  emailNotConfiguredMessage,
  getEmailProvider,
  getFromAddress,
  getFromName,
  getReplyToAddress,
  getZeptoMailApiUrl,
  getZeptoMailBounceAddress,
  getZeptoMailToken,
  isEmailConfigured,
} from "@/lib/email/config";
import { EmailSendError } from "@/lib/email/types";
import { requireEmailEnv } from "./_guard";

const TO = requireEmailEnv("TEST_EMAIL_TO", "Inbox that receives the mail transport smoke test.");
const CHECK_ONLY = process.argv.includes("--check");

/** Enough of the token to confirm which one is loaded, not enough to reuse. */
function mask(secret: string | undefined): string {
  if (!secret) return "(not set)";
  if (secret.length <= 12) return `${secret.slice(0, 2)}…${secret.slice(-2)}`;
  return `${secret.slice(0, 6)}…${secret.slice(-4)} (${secret.length} chars)`;
}

function printConfig(): void {
  const provider = getEmailProvider();
  const rows: [string, string][] = [
    ["EMAIL_PROVIDER", provider],
    ["From", getFromName() ? `${getFromName()} <${getFromAddress()}>` : getFromAddress()],
    ["Reply-To", getReplyToAddress() ?? "(not set)"],
    ["To", TO],
  ];

  if (provider === "zeptomail") {
    rows.push(
      ["ZEPTOMAIL_TOKEN", mask(getZeptoMailToken())],
      ["API URL", getZeptoMailApiUrl()],
      ["Bounce address", getZeptoMailBounceAddress() ?? "(not set)"],
    );
  } else {
    rows.push(["SENDGRID_API_KEY", mask(process.env.SENDGRID_API_KEY?.trim())]);
  }

  const width = Math.max(...rows.map(([k]) => k.length));
  console.log("Mail configuration");
  console.log("──────────────────");
  for (const [k, v] of rows) console.log(`  ${k.padEnd(width)}  ${v}`);
  console.log("");
}

const SENT_AT = new Date();

const HTML = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 4px;color:#1e40af">Mail transport is working</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px">Miyo Global CRM — automated smoke test</p>
    <table style="border-collapse:collapse;font-size:14px;width:100%">
      <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Provider</strong></td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${getEmailProvider()}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>From</strong></td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${getFromAddress()}</td></tr>
      <tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Sent at</strong></td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0">${SENT_AT.toISOString()}</td></tr>
    </table>
    <p style="margin:20px 0 0;color:#475569;font-size:14px">
      If you are reading this, HTML delivery, the From identity and the API credentials are all good.
      A plain-text part and a small attachment were included to exercise those paths too.
    </p>
  </div>
`;

async function main() {
  printConfig();

  if (!isEmailConfigured()) {
    console.error(emailNotConfiguredMessage());
    process.exit(1);
  }

  if (CHECK_ONLY) {
    console.log("--check: configuration looks complete. No email sent.");
    return;
  }

  console.log(`Sending test email to ${TO} …`);

  try {
    await sendEmail({
      to: TO,
      subject: `Miyo CRM mail test — ${getEmailProvider()} — ${SENT_AT.toISOString()}`,
      html: HTML,
      attachments: [
        {
          filename: "mail-test.txt",
          content: Buffer.from(
            `Miyo Global CRM mail transport test\nprovider=${getEmailProvider()}\nsent_at=${SENT_AT.toISOString()}\n`,
            "utf-8",
          ),
          type: "text/plain",
        },
      ],
    });
    console.log("\nOK — the provider accepted the message. Check the inbox (and spam) for it.");
  } catch (error) {
    if (error instanceof EmailSendError) {
      console.error(`\nFAILED (${error.provider})`);
      console.error(`  status:   ${error.statusCode ?? "n/a"}`);
      console.error(`  code:     ${error.providerCode ?? "n/a"}`);
      console.error(`  message:  ${error.message}`);
      if (error.details) console.error(`  details:  ${JSON.stringify(error.details)}`);
    } else {
      console.error("\nFAILED —", error instanceof Error ? error.message : error);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
