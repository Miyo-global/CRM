import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { getErrorMessage } from "./get-error-message";

function axiosErr(data: unknown, status = 500) {
  const headers = new AxiosHeaders();
  return new AxiosError("Request failed", "ERR_BAD_RESPONSE", { headers }, null, {
    data, status, statusText: "", headers, config: { headers },
  });
}

const PROD_16_OCT =
  'Failed query: select count(*) from "projects" where ("projects"."org_id" = $1 and "projects"."deleted_at" is null)\nparams: org_2abc9xyz';

describe("getErrorMessage", () => {
  it("hides the 16 Oct SQL error", () => {
    expect(getErrorMessage(axiosErr({ error: PROD_16_OCT }))).toBe("Something went wrong. Please try again.");
  });

  it("hides raw Postgres errors", () => {
    expect(getErrorMessage(new Error('column "deleted_at" does not exist'))).toBe("Something went wrong. Please try again.");
    expect(getErrorMessage(new Error('duplicate key value violates unique constraint "users_email_unique"'))).toBe("Something went wrong. Please try again.");
    expect(getErrorMessage(new Error("select id from users where id = 1"))).toBe("Something went wrong. Please try again.");
  });

  it("hides UUIDs and stack frames", () => {
    expect(getErrorMessage(new Error("row 3f2b1c4d-1a2b-4c3d-9e8f-0123456789ab not found"))).toBe("Something went wrong. Please try again.");
    expect(getErrorMessage(new Error("TypeError: x is undefined\n    at handler (route.ts:4:2)"))).toBe("Something went wrong. Please try again.");
  });

  it("keeps normal messages and appends the error ref", () => {
    expect(getErrorMessage(axiosErr({ error: "Leave balance is too low" }, 400))).toBe("Leave balance is too low");
    expect(getErrorMessage(new Error("Please select a date from the list"))).toBe("Please select a date from the list");
    expect(getErrorMessage(axiosErr({ error: "Could not load dashboard stats.", errorId: "a1b2c3d4" }))).toBe("Could not load dashboard stats. (ref a1b2c3d4)");
  });
});
