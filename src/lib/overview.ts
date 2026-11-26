/**
 * Dashboard overview: response shape of GET /api/overview and the pure
 * calculations shared by the server and the UI. Isomorphic (no I/O).
 *
 * The period is anchored to the newest order in the data, not to today: the
 * demo dataset is a snapshot, and "the last 30 days of data" is what a
 * dashboard over it can honestly show. The label always says which dates.
 */

export const PERIOD_DAYS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIOD_DAYS)[number];

export type Breakdown = { label: string; value: number };

export type OverviewKpi = {
  key: "revenue" | "orders" | "aov" | "repeat";
  label: string;
  value: number;
  previous: number;
  format: "currency" | "number" | "percent";
  /** What makes up the number, for the hover card. */
  breakdown: Breakdown[];
  /** One value per day of the period (oldest first), for the sparkline. */
  daily: number[];
};

export type Compared = { label: string; value: number; previous: number };

export type AttentionItem = {
  id: string;
  tone: "down" | "up" | "refunds";
  title: string;
  detail: string;
  /** A follow-up question to ask about it. */
  question: string;
};

export type OverviewDTO = {
  period: {
    days: PeriodDays;
    /** Inclusive ISO dates (YYYY-MM-DD). */
    start: string;
    end: string;
    previousStart: string;
    previousEnd: string;
  };
  kpis: OverviewKpi[];
  /** Daily revenue, current period and the one before it, aligned by day. */
  trend: { labels: string[]; current: number[]; previous: number[] };
  categories: Compared[];
  regions: Compared[];
  topProducts: (Compared & { category: string; units: number })[];
  attention: AttentionItem[];
};

export function parsePeriod(raw: string | null): PeriodDays | null {
  if (raw === null || raw === "") return 30;
  const value = Number(raw);
  return PERIOD_DAYS.find((days) => days === value) ?? null;
}

/** Change vs the previous period: relative % for amounts, points for a rate. */
export function describeChange(
  value: number,
  previous: number,
  format: OverviewKpi["format"],
): { text: string; direction: "up" | "down" | "flat"; ratio: number | null } {
  if (format === "percent") {
    const points = value - previous;
    const direction = Math.abs(points) < 0.05 ? "flat" : points > 0 ? "up" : "down";
    return { text: `${points > 0 ? "+" : ""}${points.toFixed(1)} pts`, direction, ratio: null };
  }
  if (previous === 0) return { text: value === 0 ? "no change" : "new", direction: value === 0 ? "flat" : "up", ratio: null };
  const ratio = (value - previous) / Math.abs(previous);
  const direction = Math.abs(ratio) < 0.0005 ? "flat" : ratio > 0 ? "up" : "down";
  return { text: `${ratio > 0 ? "+" : ""}${(ratio * 100).toFixed(1)}%`, direction, ratio };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-27" → "27 Oct 2026" (string maths: identical on server and client, no time zones). */
export function formatDay(iso: string, withYear = true): string {
  const [y, m, d] = iso.split("-").map(Number);
  return withYear ? `${d} ${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`;
}

export function periodLabel(period: OverviewDTO["period"]): string {
  return `${formatDay(period.start, false)} to ${formatDay(period.end)}`;
}

/**
 * Things worth a look, derived only from the numbers in the overview:
 * categories and regions that fell or grew sharply, and the best-moving product.
 * `refundRates` are per-category refund shares (current, previous) in percent.
 */
export function findAttention(
  categories: Compared[],
  regions: Compared[],
  refundRates: { label: string; current: number; previous: number }[],
  days: number,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const pct = (c: Compared) => (c.previous > 0 ? (c.value - c.previous) / c.previous : 0);

  for (const c of [...categories].sort((a, b) => pct(a) - pct(b))) {
    const change = pct(c);
    if (c.previous > 0 && change <= -0.15) {
      items.push({
        id: `cat-down-${c.label}`,
        tone: "down",
        title: `${c.label} revenue fell ${Math.round(-change * 100)}%`,
        detail: `Compared with the ${days} days before.`,
        question: `Why did ${c.label} revenue fall in the last ${days} days compared with the ${days} days before?`,
      });
    }
  }
  for (const r of refundRates) {
    const points = r.current - r.previous;
    if (r.current >= 3 && points >= 2) {
      items.push({
        id: `refund-${r.label}`,
        tone: "refunds",
        title: `${r.label} refunds rose to ${r.current.toFixed(1)}% of revenue`,
        detail: `Up ${points.toFixed(1)} points on the ${days} days before.`,
        question: `Which ${r.label} products were refunded most in the last ${days} days, and why?`,
      });
    }
  }
  for (const g of [...regions].sort((a, b) => pct(b) - pct(a))) {
    const change = pct(g);
    if (g.previous > 0 && change >= 0.2) {
      items.push({
        id: `region-up-${g.label}`,
        tone: "up",
        title: `${g.label} revenue grew ${Math.round(change * 100)}%`,
        detail: `Compared with the ${days} days before.`,
        question: `What drove revenue growth in ${g.label} over the last ${days} days?`,
      });
    }
    if (g.previous > 0 && change <= -0.2) {
      items.push({
        id: `region-down-${g.label}`,
        tone: "down",
        title: `${g.label} revenue fell ${Math.round(-change * 100)}%`,
        detail: `Compared with the ${days} days before.`,
        question: `Why did revenue in ${g.label} fall over the last ${days} days?`,
      });
    }
  }
  return items.slice(0, 5);
}
