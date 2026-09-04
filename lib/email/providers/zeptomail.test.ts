import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { sendViaZeptoMail } from "./zeptomail";
import { EmailSendError, type NormalizedEmail } from "../types";

function baseEmail(overrides: Partial<NormalizedEmail> = {}): NormalizedEmail {
  return {
    to: ["someone@example.com"],
    cc: [],
    bcc: [],
    from: { address: "noreply@example.com", name: "Miyo Global" },
    subject: "Subject",
    html: "<p>Hi</p>",
    text: "Hi",
    attachments: [],
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const OK_BODY = {
  data: [{ code: "EM_104", message: "Email request received" }],
  message: "OK",
  request_id: "req-123",
  object: "email",
};

describe("sendViaZeptoMail", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    process.env.ZEPTOMAIL_TOKEN = "wSsVR0000token0000";
    delete process.env.ZEPTOMAIL_API_URL;
    delete process.env.ZEPTOMAIL_BOUNCE_ADDRESS;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ZEPTOMAIL_TOKEN;
  });

  function lastRequest() {
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    return { url, init, body: JSON.parse(init.body as string) };
  }

  it("posts the documented ZeptoMail payload to the default endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, OK_BODY));

    const result = await sendViaZeptoMail(
      baseEmail({
        to: ["a@example.com", "b@example.com"],
        cc: ["c@example.com"],
        bcc: ["d@example.com"],
        replyTo: "hr@example.com",
        attachments: [{ filename: "r.csv", type: "text/csv", base64: "Zm9v" }],
      }),
    );

    expect(result.requestId).toBe("req-123");

    const { url, init, body } = lastRequest();
    expect(url).toBe("https://api.zeptomail.com/v1.1/email");
    expect(init.method).toBe("POST");
    expect(body).toMatchObject({
      from: { address: "noreply@example.com", name: "Miyo Global" },
      to: [
        { email_address: { address: "a@example.com" } },
        { email_address: { address: "b@example.com" } },
      ],
      cc: [{ email_address: { address: "c@example.com" } }],
      bcc: [{ email_address: { address: "d@example.com" } }],
      reply_to: [{ address: "hr@example.com" }],
      subject: "Subject",
      htmlbody: "<p>Hi</p>",
      textbody: "Hi",
      track_clicks: false,
      track_opens: false,
      attachments: [{ name: "r.csv", mime_type: "text/csv", content: "Zm9v" }],
    });
  });

  it("sends the Zoho-enczapikey authorization scheme", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, OK_BODY));
    await sendViaZeptoMail(baseEmail());

    const headers = lastRequest().init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Zoho-enczapikey wSsVR0000token0000");
  });

  it("does not double up the scheme when the token is pasted with its prefix", async () => {
    process.env.ZEPTOMAIL_TOKEN = "Zoho-enczapikey wSsVR0000token0000";
    fetchMock.mockResolvedValue(jsonResponse(201, OK_BODY));
    await sendViaZeptoMail(baseEmail());

    const headers = lastRequest().init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Zoho-enczapikey wSsVR0000token0000");
  });

  it("honours a regional API URL", async () => {
    process.env.ZEPTOMAIL_API_URL = "https://api.zeptomail.in/v1.1/email";
    fetchMock.mockResolvedValue(jsonResponse(201, OK_BODY));
    await sendViaZeptoMail(baseEmail());

    expect(lastRequest().url).toBe("https://api.zeptomail.in/v1.1/email");
  });

  it("omits cc, bcc, reply_to and attachments when there are none", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, OK_BODY));
    await sendViaZeptoMail(baseEmail());

    const { body } = lastRequest();
    expect(body).not.toHaveProperty("cc");
    expect(body).not.toHaveProperty("bcc");
    expect(body).not.toHaveProperty("reply_to");
    expect(body).not.toHaveProperty("attachments");
  });

  it("throws a non-retryable error with the provider code on a 4xx", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(400, {
        error: {
          code: "TM_3201",
          message: "Invalid Sender address",
          details: [{ code: "SM_133", message: "sender domain not verified", target: "from" }],
        },
      }),
    );

    const err = await sendViaZeptoMail(baseEmail()).catch((e) => e);
    expect(err).toBeInstanceOf(EmailSendError);
    expect(err.retryable).toBe(false);
    expect(err.statusCode).toBe(400);
    expect(err.providerCode).toBe("TM_3201");
    expect(err.message).toContain("sender domain not verified");
  });

  it("marks 429 and 5xx as retryable", async () => {
    for (const status of [429, 500, 503]) {
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(jsonResponse(status, { error: { code: "X", message: "nope" } }));
      const err = await sendViaZeptoMail(baseEmail()).catch((e) => e);
      expect(err.retryable, `status ${status}`).toBe(true);
    }
  });

  it("surfaces a non-JSON error body instead of an empty message", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>502 Bad Gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    );

    const err = await sendViaZeptoMail(baseEmail()).catch((e) => e);
    expect(err.message).toContain("502 Bad Gateway");
    expect(err.retryable).toBe(true);
  });

  it("treats a network failure as retryable", async () => {
    fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.zeptomail.com"));

    const err = await sendViaZeptoMail(baseEmail()).catch((e) => e);
    expect(err).toBeInstanceOf(EmailSendError);
    expect(err.retryable).toBe(true);
    expect(err.message).toContain("ENOTFOUND");
  });

  it("refuses to send without a token", async () => {
    delete process.env.ZEPTOMAIL_TOKEN;

    const err = await sendViaZeptoMail(baseEmail()).catch((e) => e);
    expect(err).toBeInstanceOf(EmailSendError);
    expect(err.retryable).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a request over the 25-recipient API limit rather than silently truncating", async () => {
    const many = Array.from({ length: 26 }, (_, i) => `user${i}@example.com`);

    const err = await sendViaZeptoMail(baseEmail({ to: many })).catch((e) => e);
    expect(err).toBeInstanceOf(EmailSendError);
    expect(err.message).toContain("25 recipients");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
