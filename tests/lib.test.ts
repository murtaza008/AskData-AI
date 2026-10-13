import { describe, expect, it } from "vitest";
import { resolveChartSpec } from "@/lib/agent/chart";
import type { ResultColumn, Row } from "@/lib/agent/types";
import { toCsv } from "@/lib/csv";
import { inferColumns, inferType, normalizeValue, tableSlug, toColumnNames } from "@/lib/uploads/infer";
import { safeCallbackUrl } from "@/features/auth/lib/callback-url";

const cols = (...pairs: [string, ResultColumn["kind"]][]): ResultColumn[] =>
  pairs.map(([name, kind]) => ({ name, kind }));

describe("resolveChartSpec", () => {
  const monthly = cols(["month", "text"], ["revenue", "number"]);
  const rows: Row[] = [
    { month: "2026-01", revenue: 10 },
    { month: "2026-02", revenue: 12 },
    { month: "2026-03", revenue: 9 },
  ];

  it("keeps a valid proposal", () => {
    const spec = resolveChartSpec({ type: "line", x: "month", y: "revenue", title: "Trend", yFormat: "currency" }, monthly, rows);
    expect(spec).toEqual({ type: "line", x: "month", y: "revenue", title: "Trend", yFormat: "currency" });
  });

  it("picks axes and a line chart for a time series when nothing is proposed", () => {
    expect(resolveChartSpec(null, monthly, rows)).toMatchObject({ type: "line", x: "month", y: "revenue", yFormat: "currency" });
  });

  it("falls back to a table for a single value", () => {
    expect(resolveChartSpec({ type: "bar" }, cols(["customers", "number"]), [{ customers: 1400 }]).type).toBe("table");
  });

  it("falls back to a table when there is nothing numeric to plot", () => {
    const spec = resolveChartSpec({ type: "bar" }, cols(["name", "text"], ["city", "text"]), [
      { name: "a", city: "x" },
      { name: "b", city: "y" },
    ]);
    expect(spec.type).toBe("table");
  });

  it("downgrades a pie with too many slices to a bar chart", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ month: `m${index}`, revenue: index + 1 }));
    expect(resolveChartSpec({ type: "pie", x: "month", y: "revenue" }, monthly, many).type).toBe("bar");
  });

  it("never plots an id column when a real measure exists", () => {
    const spec = resolveChartSpec(null, cols(["customer_id", "number"], ["name", "text"], ["orders", "number"]), [
      { customer_id: 1, name: "a", orders: 5 },
      { customer_id: 2, name: "b", orders: 3 },
    ]);
    expect(spec).toMatchObject({ x: "name", y: "orders", yFormat: "number" });
  });
});

describe("CSV type inference", () => {
  it("sanitises and de-duplicates headers", () => {
    expect(toColumnNames(["Order ID", "Total ($)", "total", "2024 Sales", "", "select", "Città"])).toEqual([
      "order_id",
      "total",
      "total_2",
      "c_2024_sales",
      "column_5",
      "select_value",
      "citta",
    ]);
  });

  it("infers a type only when every value fits", () => {
    expect(inferType(["1", "2.5", "$1,200.00", ""])).toBe("number");
    expect(inferType(["2026-01-05", "01/06/2026", "N/A"])).toBe("date");
    expect(inferType(["yes", "No", "TRUE"])).toBe("boolean");
    expect(inferType(["1", "two"])).toBe("text");
    expect(inferType(["", ""])).toBe("text");
  });

  it("normalises values and flags ones that do not fit", () => {
    expect(normalizeValue("$1,234.50", "number")).toBe("1234.5");
    expect(normalizeValue("(45)", "number")).toBe("-45");
    expect(normalizeValue("12%", "number")).toBe("12");
    expect(normalizeValue("abc", "number")).toBeUndefined();
    expect(normalizeValue("  ", "number")).toBeNull();
    expect(normalizeValue("3/9/2026", "date")).toBe("2026-03-09");
    expect(normalizeValue("2026-03-09 14:30", "date")).toBe("2026-03-09T14:30:00");
    expect(normalizeValue("2026-02-31", "date")).toBeUndefined();
    expect(normalizeValue("Y", "boolean")).toBe("true");
  });

  it("describes columns from headers and rows", () => {
    expect(inferColumns(["City", "Units"], [["Lahore", "2"], ["Dubai", "5"]])).toEqual([
      { name: "city", originalName: "City", type: "text" },
      { name: "units", originalName: "Units", type: "number" },
    ]);
  });

  it("builds a safe table slug from any file name", () => {
    expect(tableSlug("Q3 Sales (final).csv")).toBe("q3_sales_final");
    expect(tableSlug("../../etc/passwd")).toBe("etc_passwd");
    expect(tableSlug('"; DROP TABLE x; --.csv')).toBe("drop_table_x");
    expect(tableSlug(".csv")).toBe("data");
  });
});

describe("toCsv", () => {
  it("quotes fields and neutralises spreadsheet formulas", () => {
    const csv = toCsv(cols(["name", "text"], ["note", "text"], ["n", "number"]), [
      { name: 'Smith, "Jo"', note: "=HYPERLINK(1)", n: -5 },
      { name: "plain", note: null, n: 2 },
    ]);
    expect(csv).toBe('name,note,n\r\n"Smith, ""Jo""",\'=HYPERLINK(1),-5\r\nplain,,2');
  });
});

describe("safeCallbackUrl", () => {
  const origin = "https://askdata.example";
  it("allows same-origin app paths, relative or absolute", () => {
    expect(safeCallbackUrl("/app/dashboard", origin)).toBe("/app/dashboard");
    expect(safeCallbackUrl("https://askdata.example/app?q=hi", origin)).toBe("/app?q=hi");
  });
  it("refuses other origins and non-app paths", () => {
    expect(safeCallbackUrl("https://evil.example/app", origin)).toBe("/app");
    expect(safeCallbackUrl("//evil.example/app", origin)).toBe("/app");
    expect(safeCallbackUrl("/login", origin)).toBe("/app");
    expect(safeCallbackUrl(null, origin)).toBe("/app");
  });
});
