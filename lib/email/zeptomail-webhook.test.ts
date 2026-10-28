import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { eventText, parseBounces, verifyZeptoSignature } from "./zeptomail-webhook";

const SECRET = "whsec";
const NOW = 1_800_000_000_000;
const sign = (msg: string, ts = NOW) =>
  `ts=${ts};s=${encodeURIComponent(createHmac("sha256", SECRET).update(msg).digest("base64"))};s-algorithm=HmacSHA256`;

const event = JSON.stringify({
  event_name: ["hard bounce"],
  event_message: [
    { request_id: "req-1", event_data: [{ details: [{ reason: "Mailbox not found", diagnostic_message: "550 5.1.1" }] }] },
  ],
});

describe("verifyZeptoSignature", () => {
  it("accepts a JSON body signed with the secret", () => {
    expect(verifyZeptoSignature(sign(event), event, SECRET, NOW)).toBe(true);
  });

  it("accepts a form body whose decoded parameter was signed", () => {
    const body = `payload=${encodeURIComponent(event)}`;
    expect(eventText(body)).toBe(event);
    expect(verifyZeptoSignature(sign(event), body, SECRET, NOW)).toBe(true);
  });

  it("rejects a wrong secret, tampered body, stale timestamp or other algorithm", () => {
    expect(verifyZeptoSignature(sign(event), event, "other", NOW)).toBe(false);
    expect(verifyZeptoSignature(sign(event), event + " ", SECRET, NOW)).toBe(false);
    expect(verifyZeptoSignature(sign(event, NOW - 10 * 60 * 1000), event, SECRET, NOW)).toBe(false);
    expect(verifyZeptoSignature(sign(event).replace("HmacSHA256", "HmacSHA1"), event, SECRET, NOW)).toBe(false);
    expect(verifyZeptoSignature(null, event, SECRET, NOW)).toBe(false);
  });
});

describe("parseBounces", () => {
  it("extracts request id and reason from bounce events", () => {
    expect(parseBounces(JSON.parse(event))).toEqual([
      { requestId: "req-1", reason: "hard bounce: Mailbox not found — 550 5.1.1" },
    ]);
  });

  it("ignores non-bounce events", () => {
    expect(parseBounces({ event_name: ["email_open"], event_message: [{ request_id: "x" }] })).toEqual([]);
  });
});
