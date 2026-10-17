import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * MIYO-0683: the public apply endpoint. The database, storage and mail are
 * stubbed; what is under test is the gate in front of them — validation,
 * the honeypot, the rate limit, file-type spoofing, consent, and reusing a
 * candidate who has applied before.
 */
vi.mock("@/lib/constants/modules", () => ({ ATS_MODULE_ENABLED: true }));

const rateLimit = vi.fn(async () => ({ allowed: true, retryAfterSecs: 0 }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: (...args: unknown[]) => rateLimit(...(args as [])) }));

const verifyTurnstile = vi.fn(async () => true);
vi.mock("@/lib/ats/turnstile", () => ({ verifyTurnstile: () => verifyTurnstile() }));

const OPEN_JOB = {
  id: 7,
  orgId: "org1",
  title: "Backend Engineer",
  slug: "backend-engineer",
  location: "Hyderabad",
  status: "OPEN",
  closesAt: null,
};

const existingCandidate = { value: null as null | { id: number; email: string } };
const inserted: Record<string, unknown[]> = {};

function table(name: string) {
  return {
    values: (rows: unknown) => {
      inserted[name] = [...(inserted[name] ?? []), ...(Array.isArray(rows) ? rows : [rows])];
      return {
        returning: async () => [{ id: 1, ...(Array.isArray(rows) ? rows[0] : (rows as object)) }],
        onConflictDoNothing: async () => undefined,
        then: (resolve: (v: unknown) => unknown) => resolve(undefined),
      };
    },
  };
}

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      jobPostings: { findFirst: async () => OPEN_JOB },
      candidates: { findFirst: async () => existingCandidate.value },
      candidateApplications: { findFirst: async () => null },
    },
    select: () => ({ from: () => ({ where: async () => [], innerJoin: () => ({ where: async () => [] }) }) }),
    insert: (t: { name?: string }) => table(String(t?.name ?? "unknown")),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ id: 1 }] }) }) }),
  },
}));

vi.mock("@/lib/db/schema", () => {
  const names = [
    "atsActivity",
    "atsApplicationAnswers",
    "atsApplicationQuestions",
    "atsConsents",
    "atsJobMembers",
    "candidateApplications",
    "candidates",
    "jobPostings",
    "users",
  ];
  return Object.fromEntries(names.map((n) => [n, { name: n }]));
});

vi.mock("@/lib/ats/careers", () => ({ jobIsOpen: () => true }));
vi.mock("@/lib/ats/stages", () => ({ firstStageId: async () => 1 }));
vi.mock("@/lib/ats/duplicates", () => ({
  findDuplicates: async () =>
    existingCandidate.value
      ? [{ id: existingCandidate.value.id, matchedOn: "email", firstName: "Asha", lastName: "Rao", email: existingCandidate.value.email, phone: null }]
      : [],
}));
vi.mock("@/lib/storage", () => ({
  uploadFile: async () => ({ key: "o/org1/resumes/x.pdf", url: "x", size: 10, mimeType: "application/pdf" }),
}));
vi.mock("@/lib/files/extract-resume-text", () => ({ extractResumeText: async () => "resume words" }));

const sendApplicationEmails = vi.fn(async () => undefined);
vi.mock("@/lib/ats/application-emails", () => ({
  sendApplicationEmails: () => sendApplicationEmails(),
}));

const { POST } = await import("../route");

/** A real PDF starts %PDF-; anything else is a spoof. */
function pdf(bytes = "%PDF-1.7 hello"): File {
  return new File([new Uint8Array(Buffer.from(bytes))], "cv.pdf", { type: "application/pdf" });
}

function form(overrides: Record<string, string | File | undefined> = {}) {
  const data = new FormData();
  data.set("jobId", "7");
  data.set("firstName", "Asha");
  data.set("lastName", "Rao");
  data.set("email", "asha@example.com");
  data.set("phone", "9876543210");
  data.set("consent", "true");
  data.set("resume", pdf());
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) data.delete(key);
    else data.set(key, value);
  }
  return data;
}

function request(data: FormData) {
  return new NextRequest("http://localhost/api/public/ats/apply", {
    method: "POST",
    body: data,
    headers: { "x-forwarded-for": "203.0.113.5" },
  });
}

beforeEach(() => {
  existingCandidate.value = null;
  for (const key of Object.keys(inserted)) delete inserted[key];
  rateLimit.mockResolvedValue({ allowed: true, retryAfterSecs: 0 });
  verifyTurnstile.mockResolvedValue(true);
  sendApplicationEmails.mockClear();
});

describe("POST /api/public/ats/apply", () => {
  it("takes a complete application and sends the mails", async () => {
    const res = await POST(request(form()));
    expect(res.status).toBe(201);
    expect(sendApplicationEmails).toHaveBeenCalledOnce();
  });

  it("refuses an application with no consent", async () => {
    const res = await POST(request(form({ consent: undefined })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/consent/i);
  });

  it("refuses an invalid email address", async () => {
    const res = await POST(request(form({ email: "not-an-address" })));
    expect(res.status).toBe(400);
  });

  it("refuses a file whose bytes are not a PDF", async () => {
    const spoof = new File([new Uint8Array(Buffer.from("MZ not a pdf"))], "cv.pdf", {
      type: "application/pdf",
    });
    const res = await POST(request(form({ resume: spoof })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/PDF or Word/i);
  });

  it("answers 429 when the IP has applied too often", async () => {
    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSecs: 600 });
    const res = await POST(request(form()));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("600");
  });

  it("drops a submission that filled the honeypot", async () => {
    const res = await POST(request(form({ website: "http://spam.example" })));
    expect(res.status).toBe(400);
    expect(sendApplicationEmails).not.toHaveBeenCalled();
  });

  it("refuses when Turnstile says no", async () => {
    verifyTurnstile.mockResolvedValueOnce(false);
    const res = await POST(request(form()));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/human/i);
  });

  it("reuses the candidate already on file for that email", async () => {
    existingCandidate.value = { id: 42, email: "asha@example.com" };
    const res = await POST(request(form()));
    expect(res.status).toBe(201);
    // No second candidate row was written for the same person.
    expect(inserted.candidates ?? []).toHaveLength(0);
  });
});
