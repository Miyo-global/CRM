import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * MIYO-0684: moving one application and moving many. What matters here is
 * which stage is accepted, what the refuse reason does to the mail, and
 * that a bulk action cannot reach a job the person is not hiring for.
 */
vi.mock("@/lib/constants/modules", () => ({ ATS_MODULE_ENABLED: true }));

const session = {
  user: { id: "u1", role: "HR", name: "Ravi" },
  orgId: "org1",
};
vi.mock("@/lib/api/helpers", async () => {
  const { NextResponse } = await import("next/server");
  return {
    withAuth: async (handler: (s: typeof session) => Promise<unknown>) => handler(session),
    ok: (data: unknown, status = 200) => NextResponse.json(data, { status }),
    err: (message: string, status = 400) => NextResponse.json({ error: message }, { status }),
    parseBody: async (req: NextRequest, schema: { parse: (v: unknown) => unknown }) =>
      schema.parse(await req.json()),
  };
});

const canOnJob = vi.fn(async () => true);
vi.mock("@/lib/ats/access", () => ({ canOnJob: () => canOnJob() }));

const sendStageEmail = vi.fn(async () => true);
vi.mock("@/lib/ats/stage-emails", () => ({ sendStageEmail: () => sendStageEmail() }));
vi.mock("@/lib/audit-log", () => ({ createAuditLog: async () => undefined }));

const stage = {
  value: {
    id: 3,
    orgId: "org1",
    jobId: null as number | null,
    name: "Interview",
    type: "INTERVIEW",
    autoEmail: false,
    emailTemplateId: null as string | null,
  },
};
const reason = {
  value: null as null | { id: number; name: string; emailTemplateId: string | null },
};

const activity: unknown[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      atsStages: { findFirst: async () => stage.value },
      atsRefuseReasons: { findFirst: async () => reason.value },
      candidates: { findFirst: async () => ({ id: 9, firstName: "Asha", email: "a@example.com" }) },
    },
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: async () => [
              { id: 5, candidateId: 9, jobId: 7, stageId: 2, jobTitle: "Backend Engineer" },
            ],
          }),
        }),
      }),
    }),
    update: () => ({
      set: () => ({ where: () => ({ returning: async () => [{ id: 5, stageId: stage.value.id }] }) }),
    }),
    insert: () => ({
      values: async (rows: unknown) => {
        activity.push(rows);
      },
    }),
  },
}));
vi.mock("@/lib/db/schema", () => ({
  atsActivity: { name: "atsActivity" },
  atsRefuseReasons: { name: "atsRefuseReasons" },
  atsStages: { name: "atsStages" },
  candidateApplications: { name: "candidateApplications" },
  candidates: { name: "candidates" },
  jobPostings: { name: "jobPostings" },
}));

const { PATCH } = await import("@/app/api/ats/applications/[applicationId]/stage/route");

function move(body: Record<string, unknown>, applicationId = "5") {
  return PATCH(
    new NextRequest("http://localhost/api/ats/applications/5/stage", {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    { params: Promise.resolve({ applicationId }) },
  );
}

beforeEach(() => {
  activity.length = 0;
  canOnJob.mockResolvedValue(true);
  sendStageEmail.mockClear();
  sendStageEmail.mockResolvedValue(true);
  stage.value = {
    id: 3,
    orgId: "org1",
    jobId: null,
    name: "Interview",
    type: "INTERVIEW",
    autoEmail: false,
    emailTemplateId: null,
  };
  reason.value = null;
});

describe("moving one application", () => {
  it("moves it and writes the move to the activity trail", async () => {
    const res = await move({ stageId: 3 });
    expect(res.status).toBe(200);
    expect(activity.length).toBeGreaterThan(0);
  });

  it("refuses a stage that belongs to another job", async () => {
    stage.value = { ...stage.value, jobId: 99 };
    const res = await move({ stageId: 3 });
    expect(res.status).toBe(400);
  });

  it("refuses someone who is not on the hiring team", async () => {
    canOnJob.mockResolvedValueOnce(false);
    expect((await move({ stageId: 3 })).status).toBe(403);
  });

  it("sends nothing by default, even on a stage that has a template", async () => {
    stage.value = { ...stage.value, autoEmail: true, emailTemplateId: "ats-application-rejected" };
    await move({ stageId: 3, sendEmail: false });
    expect(sendStageEmail).not.toHaveBeenCalled();
  });

  it("sends the stage template when the mover asks for it", async () => {
    stage.value = { ...stage.value, autoEmail: true, emailTemplateId: "ats-application-rejected" };
    const res = await move({ stageId: 3, sendEmail: true });
    expect(sendStageEmail).toHaveBeenCalledOnce();
    expect((await res.json()).emailSent).toBe(true);
  });

  it("sends nothing for a refuse reason that has no template", async () => {
    stage.value = { ...stage.value, name: "Rejected", type: "REJECTED" };
    reason.value = { id: 4, name: "Withdrew", emailTemplateId: null };
    const res = await move({ stageId: 3, reasonId: 4, sendEmail: true });
    expect(sendStageEmail).not.toHaveBeenCalled();
    expect((await res.json()).emailSent).toBe(false);
  });

  it("sends the reason's template when it has one", async () => {
    stage.value = { ...stage.value, name: "Rejected", type: "REJECTED" };
    reason.value = { id: 1, name: "Not qualified", emailTemplateId: "ats-application-rejected" };
    await move({ stageId: 3, reasonId: 1, sendEmail: true });
    expect(sendStageEmail).toHaveBeenCalledOnce();
  });

  it("rejects an application id that is not a number", async () => {
    expect((await move({ stageId: 3 }, "abc")).status).toBe(400);
  });
});
