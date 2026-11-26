import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Route handlers with the session and the database replaced by in-memory fakes:
 * 401 when signed out, 403 for the shared demo account's destructive actions,
 * 404 for another user's record (every query is scoped by user id), 400 for
 * bad input.
 */

type FakeUser = { id: string; email: string; name: string; isDemo: boolean } | null;
let sessionUser: FakeUser = null;
vi.mock("@/server/auth/auth", () => ({
  auth: async () => (sessionUser ? { user: sessionUser } : null),
}));

// Records owned by user "u1"; "u2" is someone else.
const conversations = [{ id: "c1", userId: "u1", title: "Revenue by region" }];
const pins = [{ id: "p1", userId: "u1" }];
const turnCount = vi.fn(async () => 7);

function scoped<T extends { id: string; userId: string }>(rows: T[]) {
  return async ({ where }: { where: { id: string; userId: string } }) => ({
    count: rows.filter((row) => row.id === where.id && row.userId === where.userId).length,
  });
}

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    turn: { count: (...args: unknown[]) => turnCount(...(args as [])) },
    conversation: { updateMany: scoped(conversations), deleteMany: scoped(conversations) },
    pinnedChart: { deleteMany: scoped(pins) },
  },
}));
vi.mock("@/server/db/pools", () => ({ analyticsPool: () => ({}), ownerPool: () => ({}) }));
const deleteUpload = vi.fn(async () => undefined);
vi.mock("@/server/services/uploads", () => ({ deleteUpload: (...args: unknown[]) => deleteUpload(...(args as [])) }));

const me = await import("@/app/api/me/route");
const conversation = await import("@/app/api/conversations/[id]/route");
const pin = await import("@/app/api/pins/[id]/route");
const upload = await import("@/app/api/uploads/[id]/route");

const owner = { id: "u1", email: "owner@example.com", name: "Owner", isDemo: false };
const other = { id: "u2", email: "other@example.com", name: "Other", isDemo: false };
const demo = { id: "d1", email: "demo@askdata.app", name: "Demo Analyst", isDemo: true };

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const patch = (body: unknown) =>
  new Request("http://test/api/conversations/c1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const del = () => new Request("http://test", { method: "DELETE" });

beforeEach(() => {
  sessionUser = null;
  vi.clearAllMocks();
});

describe("GET /api/me", () => {
  it("is 401 when signed out", async () => {
    expect((await me.GET()).status).toBe(401);
  });

  it("reports the demo account's quota", async () => {
    sessionUser = demo;
    const res = await me.GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ isDemo: true, usage: { questionsLast24h: 7, dailyLimit: 150 } });
  });

  it("counts only the caller's own questions, and has no limit for normal accounts", async () => {
    sessionUser = owner;
    const body = await (await me.GET()).json();
    expect(body.usage).toEqual({ questionsLast24h: 7, dailyLimit: null });
    expect(turnCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ conversation: { userId: "u1" } }) }),
    );
  });

  it("never sends secrets: only name, email, isDemo and usage", async () => {
    sessionUser = owner;
    const body = await (await me.GET()).json();
    expect(Object.keys(body).sort()).toEqual(["email", "isDemo", "name", "usage"]);
  });
});

describe("PATCH /api/conversations/[id] (rename)", () => {
  it("is 401 when signed out", async () => {
    expect((await conversation.PATCH(patch({ title: "x" }), params("c1"))).status).toBe(401);
  });

  it("is 403 for the shared demo account", async () => {
    sessionUser = demo;
    const res = await conversation.PATCH(patch({ title: "x" }), params("c1"));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/shared demo account can't rename/);
  });

  it("is 404 for another user's conversation", async () => {
    sessionUser = other;
    expect((await conversation.PATCH(patch({ title: "Mine now" }), params("c1"))).status).toBe(404);
  });

  it("is 400 for an empty title or malformed JSON", async () => {
    sessionUser = owner;
    expect((await conversation.PATCH(patch({ title: "  " }), params("c1"))).status).toBe(400);
    expect((await conversation.PATCH(patch("{not json"), params("c1"))).status).toBe(400);
  });

  it("renames the owner's conversation", async () => {
    sessionUser = owner;
    expect((await conversation.PATCH(patch({ title: "Regions" }), params("c1"))).status).toBe(200);
  });
});

describe("DELETE routes", () => {
  it("are 401 when signed out", async () => {
    expect((await conversation.DELETE(del(), params("c1"))).status).toBe(401);
    expect((await pin.DELETE(del(), params("p1"))).status).toBe(401);
    expect((await upload.DELETE(del(), params("x1"))).status).toBe(401);
  });

  it("are 403 for the shared demo account, and nothing is deleted", async () => {
    sessionUser = demo;
    expect((await conversation.DELETE(del(), params("c1"))).status).toBe(403);
    expect((await pin.DELETE(del(), params("p1"))).status).toBe(403);
    expect((await upload.DELETE(del(), params("x1"))).status).toBe(403);
    expect(deleteUpload).not.toHaveBeenCalled();
  });

  it("are 404 for another user's records", async () => {
    sessionUser = other;
    expect((await conversation.DELETE(del(), params("c1"))).status).toBe(404);
    expect((await pin.DELETE(del(), params("p1"))).status).toBe(404);
  });

  it("delete the owner's records", async () => {
    sessionUser = owner;
    expect((await conversation.DELETE(del(), params("c1"))).status).toBe(200);
    expect((await pin.DELETE(del(), params("p1"))).status).toBe(200);
    expect((await upload.DELETE(del(), params("x1"))).status).toBe(200);
    expect(deleteUpload).toHaveBeenCalledWith("u1", "x1");
  });
});
