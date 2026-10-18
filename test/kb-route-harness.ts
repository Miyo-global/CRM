/**
 * Shared mocks for KB route tests (KB-0035 onward).
 *
 * Route handlers are where the permission check, the Zod body and the status
 * code live, so they are worth testing directly; what they talk to is not. This
 * fakes the session, the org flags and the few Drizzle shapes the handlers use,
 * and nothing else.
 */
export interface HarnessSession {
  user: { id: string; role: string | null; isActive?: boolean };
  orgId: string;
}

export const harness = {
  session: null as HarnessSession | null,
  /** kb:* permissions the actor holds, on top of nothing. */
  permissions: [] as string[],
  flags: { knowledgeBase: true } as Record<string, boolean>,
  /** Rows returned by db.query.<table>.findFirst / findMany, keyed by table. */
  findFirst: {} as Record<string, unknown>,
  findMany: {} as Record<string, unknown[]>,
  /** Rows returned by a select().from().where() chain, in call order. */
  selectRows: [] as unknown[][],
  /** Captured writes. */
  inserts: [] as Array<{ rows: unknown; returned: unknown[] }>,
  updates: [] as Array<Record<string, unknown>>,
  deletes: 0,
  /** What the next insert().returning() hands back. */
  insertReturns: [] as unknown[][],
  audits: [] as Array<Record<string, unknown>>,
  reset() {
    harness.session = { user: { id: "u1", role: "ENGINEERING" }, orgId: "org-a" };
    harness.permissions = [];
    harness.flags = { knowledgeBase: true };
    harness.findFirst = {};
    harness.findMany = {};
    harness.selectRows = [];
    harness.inserts = [];
    harness.updates = [];
    harness.deletes = 0;
    harness.insertReturns = [];
    harness.audits = [];
  },
};

function queryProxy() {
  return new Proxy(
    {},
    {
      get: (_target, table: string) => ({
        findFirst: async () => harness.findFirst[table] ?? undefined,
        findMany: async () => harness.findMany[table] ?? [],
      }),
    },
  );
}

function selectChain() {
  const rows = () => harness.selectRows.shift() ?? [];
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const key of ["from", "where", "orderBy", "limit", "offset", "groupBy", "innerJoin", "leftJoin"]) {
    chain[key] = () => self();
  }
  // Awaiting the chain resolves to the next queued row set.
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(rows()).then(resolve);
  return chain;
}

/**
 * The mock factories. vi.mock is hoisted per test file, so each KB route test
 * lists them at its own top level:
 *
 *   vi.mock("@/lib/auth", () => kbMocks.auth());
 *   vi.mock("@/lib/db", () => kbMocks.db());
 *   …
 */
export const kbMocks = {
  auth: () => ({ auth: async () => harness.session }),

  orgFeatures: () => ({
    getOrgFeatureFlags: async () => ({ knowledgeBase: true, ...harness.flags }),
    parseOrgFeatureFlags: (settings: unknown) => settings,
  }),

  actor: async (importOriginal: () => Promise<unknown>) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    const { kbNotFound } = await import("@/lib/knowledge/errors");
    const actorFor = (session: HarnessSession) => ({
      userId: session.user.id,
      orgId: session.orgId,
      role: session.user.role,
      permissions: harness.permissions,
    });
    return {
      ...actual,
      resolveKbPermissions: async () => harness.permissions,
      kbActorFromSession: async (session: HarnessSession) => actorFor(session),
      kbContext: async (session: HarnessSession) =>
        harness.flags.knowledgeBase === false
          ? { response: kbNotFound() }
          : { actor: actorFor(session) },
    };
  },

  auditLog: () => ({
    createAuditLog: async (entry: Record<string, unknown>) => {
      harness.audits.push(entry);
    },
  }),

  logger: () => ({
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  }),

  db: () => ({
    db: {
      query: queryProxy(),
      select: () => selectChain(),
      execute: async () => [],
      insert: () => ({
        values: (rows: unknown) => {
          const returned = harness.insertReturns.shift() ?? [{ id: 1 }];
          harness.inserts.push({ rows, returned });
          const result: Record<string, unknown> = {
            onConflictDoNothing: () => result,
            onConflictDoUpdate: () => result,
            returning: async () => returned,
            then: (resolve: (v: unknown) => unknown) => Promise.resolve(returned).then(resolve),
          };
          return result;
        },
      }),
      update: () => ({
        set: (values: Record<string, unknown>) => {
          harness.updates.push(values);
          const result: Record<string, unknown> = {
            where: () => result,
            returning: async () => [{ id: 1, ...values }],
            then: (resolve: (v: unknown) => unknown) => Promise.resolve([{ id: 1 }]).then(resolve),
          };
          return result;
        },
      }),
      delete: () => ({
        where: async () => {
          harness.deletes += 1;
        },
      }),
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(undefined),
    },
  }),
};

/** A NextRequest-shaped object, enough for parseBody and nextUrl. */
export function kbRequest(
  url: string,
  init: { method?: string; body?: unknown } = {},
): Request & { nextUrl: URL } {
  const full = url.startsWith("http") ? url : `http://localhost${url}`;
  const request = new Request(full, {
    method: init.method ?? "GET",
    ...(init.body === undefined
      ? {}
      : { body: JSON.stringify(init.body), headers: { "content-type": "application/json" } }),
  });
  return Object.assign(request, { nextUrl: new URL(full) });
}
