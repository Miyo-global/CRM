import { describe, expect, it } from "vitest";
import { helpdeskReplyNotice } from "./helpdesk-reply-notice";

const base = {
  ticketId: 7,
  ticketTitle: "QA-TEST FR1 ticket",
  ownerId: "emp",
  assigneeId: "hr",
  authorName: "Demo HR",
  kind: "comment" as const,
  body: "We have reset your access.",
};

describe("helpdeskReplyNotice (FR1-006)", () => {
  it("tells the employee when HR replies", () => {
    expect(helpdeskReplyNotice({ ...base, authorId: "hr" })).toEqual({
      userId: "emp",
      title: 'New reply on "QA-TEST FR1 ticket"',
      message: "Demo HR: We have reset your access.",
      link: "/hr/helpdesk?ticket=7",
    });
  });

  it("tells the assignee when the employee replies", () => {
    expect(helpdeskReplyNotice({ ...base, authorId: "emp", authorName: "Emp" })?.userId).toBe("hr");
  });

  it("stays quiet for internal notes and when nobody else is involved", () => {
    expect(helpdeskReplyNotice({ ...base, authorId: "hr", kind: "internal_note" })).toBeNull();
    expect(helpdeskReplyNotice({ ...base, authorId: "emp", assigneeId: null })).toBeNull();
  });
});
