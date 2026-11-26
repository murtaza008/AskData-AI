import { beforeEach, describe, expect, it, vi } from "vitest";
import { describeChange, findAttention, formatDay, parsePeriod, periodLabel } from "@/lib/overview";

/* GET /api/overview with the session and the read-only pool replaced by fakes. */

let signedIn = false;
vi.mock("@/server/auth/auth", () => ({
  auth: async () => (signedIn ? { user: { id: "u1", email: "a@example.com", name: "A", isDemo: false } } : null),
}));

const query = vi.fn(async (sql: string, params: unknown[]) => {
  void params;
  if (sql.includes("max(order_date)::date::text")) return { rows: [{ e: "2026-10-27" }] };
  if (sql.includes("GROUP BY ago")) {
    return { rows: [{ ago: 0, orders: 2, revenue: 300 }, { ago: 1, orders: 1, revenue: 100 }, { ago: 8, orders: 3, revenue: 250 }] };
  }
  if (sql.includes("GROUP BY period, channel")) {
    return {
      rows: [
        { period: "current", channel: "web", orders: 2, revenue: 300 },
        { period: "current", channel: "mobile", orders: 1, revenue: 100 },
        { period: "previous", channel: "web", orders: 3, revenue: 250 },
      ],
    };
  }
  if (sql.includes("per_customer")) {
    return { rows: [{ period: "current", customers: 2, repeaters: 1 }, { period: "previous", customers: 3, repeaters: 0 }] };
  }
  if (sql.includes("p.category AS label, sum(oi.quantity")) {
    return { rows: [{ period: "current", label: "Apparel", value: 100 }, { period: "previous", label: "Apparel", value: 200 }] };
  }
  if (sql.includes("c.region AS label")) {
    return { rows: [{ period: "current", label: "Europe", value: 400 }, { period: "previous", label: "Europe", value: 250 }] };
  }
  if (sql.includes("p.name AS label")) {
    return { rows: [{ period: "current", label: "Tote", category: "Bags", value: 90, units: 3 }] };
  }
  if (sql.includes("AS rate")) return { rows: [] };
  return { rows: [] };
});
vi.mock("@/server/db/pools", () => ({ analyticsPool: () => ({ query }), ownerPool: () => ({}) }));
vi.mock("@/server/db/prisma", () => ({ prisma: {} }));

const route = await import("@/app/api/overview/route");
const get = (search = "") => route.GET(new Request(`http://test/api/overview${search}`));

beforeEach(() => {
  signedIn = false;
  query.mockClear();
});

describe("GET /api/overview", () => {
  it("is 401 when signed out", async () => {
    expect((await get()).status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("is 400 for a period other than 7, 30 or 90 days", async () => {
    signedIn = true;
    for (const bad of ["?days=14", "?days=abc", "?days=-7", "?days=30.5"]) {
      const res = await get(bad);
      expect(res.status, bad).toBe(400);
    }
    expect(query).not.toHaveBeenCalled();
  });

  it("anchors the period to the newest order and compares with the days before", async () => {
    signedIn = true;
    const res = await get("?days=7");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.period).toEqual({
      days: 7,
      start: "2026-10-21",
      end: "2026-10-27",
      previousStart: "2026-10-14",
      previousEnd: "2026-10-20",
    });
    // Each query's parameters match its placeholders: the period length, or none (no string-built SQL).
    for (const [sql, params] of query.mock.calls) expect(params).toEqual(sql.includes("$1") ? [7] : []);

    const revenue = body.kpis.find((k: { key: string }) => k.key === "revenue");
    expect(revenue).toMatchObject({ value: 400, previous: 250, format: "currency" });
    expect(revenue.daily).toEqual([0, 0, 0, 0, 0, 100, 300]);
    expect(body.trend.labels[6]).toBe("2026-10-27");
    expect(body.trend.previous[6]).toBe(0);
    expect(body.trend.previous[5]).toBe(250);

    const aov = body.kpis.find((k: { key: string }) => k.key === "aov");
    expect(aov.value).toBeCloseTo(400 / 3);
    const repeat = body.kpis.find((k: { key: string }) => k.key === "repeat");
    expect(repeat).toMatchObject({ value: 50, previous: 0 });

    expect(body.categories).toEqual([{ label: "Apparel", value: 100, previous: 200 }]);
    expect(body.topProducts[0]).toMatchObject({ label: "Tote", category: "Bags", units: 3, previous: 0 });
    // Apparel fell 50%, Europe grew 60%: both are worth a look.
    expect(body.attention.map((a: { id: string }) => a.id)).toEqual(["cat-down-Apparel", "region-up-Europe"]);
  });

  it("defaults to 30 days", async () => {
    signedIn = true;
    const body = await (await get()).json();
    expect(body.period.days).toBe(30);
  });
});

describe("overview helpers", () => {
  it("parses only the allowed periods", () => {
    expect(parsePeriod(null)).toBe(30);
    expect(parsePeriod("90")).toBe(90);
    expect(parsePeriod("31")).toBeNull();
  });

  it("describes changes as % for amounts and points for rates", () => {
    expect(describeChange(110, 100, "currency")).toMatchObject({ text: "+10.0%", direction: "up" });
    expect(describeChange(12.5, 10, "percent")).toMatchObject({ text: "+2.5 pts", direction: "up" });
    expect(describeChange(0, 0, "number")).toMatchObject({ direction: "flat" });
    expect(describeChange(5, 0, "number")).toMatchObject({ text: "new", direction: "up" });
  });

  it("formats dates without time zones", () => {
    expect(formatDay("2026-01-05")).toBe("5 Jan 2026");
    expect(periodLabel({ days: 7, start: "2026-10-21", end: "2026-10-27", previousStart: "", previousEnd: "" })).toBe(
      "21 Oct to 27 Oct 2026",
    );
  });

  it("flags rising refund rates", () => {
    const items = findAttention([], [], [{ label: "Electronics", current: 6.2, previous: 3.1 }], 30);
    expect(items[0]).toMatchObject({ id: "refund-Electronics", tone: "refunds" });
    expect(findAttention([], [], [{ label: "Home", current: 2, previous: 0 }], 30)).toEqual([]);
  });
});
