/**
 * Synthetic e-commerce dataset generator for the `analytics` schema.
 *
 * Pure and deterministic: the same `today` always produces the same data, so
 * a demo deployment and a local checkout agree. Dates are anchored to `today`
 * so "last month" style questions always have fresh data to hit.
 *
 * Patterns deliberately baked in (so charts have a story to tell):
 *   - steady growth across the 12 months, a November/December holiday peak
 *     and a soft summer dip; weekends are busier than weekdays
 *   - a Black Friday week with deep discounts and a volume spike
 *   - a handful of runaway best-sellers, a long tail of slow movers
 *   - a loyal minority of customers who place most of the repeat orders
 *   - category seasonality (Outdoor in summer, Apparel in winter)
 *   - refund rates that differ by category, with Apparel worst
 *   - regions of different sizes; the Middle East orders less but bigger
 *   - mobile's share of orders rising over the year
 */

export type CustomerRow = {
  id: number;
  name: string;
  email: string;
  segment: string;
  region: string;
  country: string;
  city: string;
  signupDate: string;
};

export type ProductRow = {
  id: number;
  name: string;
  category: string;
  price: number;
  cost: number;
  isActive: boolean;
  launchedAt: string;
};

export type OrderRow = {
  id: number;
  customerId: number;
  orderDate: string;
  status: string;
  channel: string;
  totalAmount: number;
};

export type OrderItemRow = {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
};

export type RefundRow = {
  id: number;
  orderId: number;
  amount: number;
  reason: string;
  refundedAt: string;
};

export type Dataset = {
  customers: CustomerRow[];
  products: ProductRow[];
  orders: OrderRow[];
  orderItems: OrderItemRow[];
  refunds: RefundRow[];
};

const DAY_MS = 86_400_000;
const CUSTOMER_COUNT = 1400;
const HISTORY_DAYS = 365;

/** Small, fast, seedable PRNG (mulberry32). */
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (value: number) => Math.round(value * 100) / 100;
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

// [region, weight, order-size multiplier, [country, [cities]]]
const GEOGRAPHY: [string, number, number, [string, string[]][]][] = [
  ["North America", 40, 1, [
    ["United States", ["New York", "Los Angeles", "Chicago", "Austin", "Seattle", "Miami"]],
    ["Canada", ["Toronto", "Vancouver", "Montreal"]],
  ]],
  ["Europe", 29, 1.05, [
    ["United Kingdom", ["London", "Manchester", "Edinburgh"]],
    ["Germany", ["Berlin", "Munich", "Hamburg"]],
    ["France", ["Paris", "Lyon"]],
    ["Netherlands", ["Amsterdam", "Rotterdam"]],
    ["Spain", ["Madrid", "Barcelona"]],
  ]],
  ["Asia Pacific", 18, 0.95, [
    ["Australia", ["Sydney", "Melbourne"]],
    ["Singapore", ["Singapore"]],
    ["Japan", ["Tokyo", "Osaka"]],
    ["India", ["Bengaluru", "Mumbai"]],
  ]],
  ["Middle East", 7, 1.6, [
    ["United Arab Emirates", ["Dubai", "Abu Dhabi"]],
    ["Saudi Arabia", ["Riyadh", "Jeddah"]],
  ]],
  ["Latin America", 6, 0.85, [
    ["Brazil", ["São Paulo", "Rio de Janeiro"]],
    ["Mexico", ["Mexico City", "Guadalajara"]],
  ]],
];

const FIRST_NAMES = [
  "Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Lucas", "Mia", "Oliver",
  "Amelia", "Elijah", "Harper", "James", "Evelyn", "Benjamin", "Charlotte", "Henry", "Aisha", "Omar", "Fatima",
  "Yusuf", "Leila", "Hassan", "Priya", "Arjun", "Ananya", "Rohan", "Mei", "Hiroshi", "Yuki", "Kenji", "Sofia",
  "Mateo", "Valentina", "Diego", "Camila", "Lukas", "Hannah", "Felix", "Clara", "Jonas", "Chloe", "Hugo",
  "Ingrid", "Sven", "Zara", "Theo",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Martinez", "Wilson", "Anderson",
  "Taylor", "Thomas", "Moore", "Martin", "Lee", "Walker", "Hall", "Young", "King", "Khan", "Ahmed", "Hussain",
  "Al-Farsi", "Patel", "Sharma", "Singh", "Tanaka", "Sato", "Chen", "Wang", "Müller", "Schmidt", "Fischer",
  "Dubois", "Laurent", "Rossi", "Silva", "Santos", "Fernández", "López", "de Vries", "Jansen", "Nilsson",
  "O'Brien", "Murphy", "Evans", "Clarke", "Baker", "Novak",
];

const BUSINESS_SUFFIXES = ["Studio", "Trading Co", "Supply", "Collective", "Group", "Partners", "Works"];

// [name, category, price, popularity weight]. A few items are heavy hitters.
const CATALOG: [string, string, number, number][] = [
  ["Linen Overshirt", "Apparel", 89, 9],
  ["Merino Crew Sweater", "Apparel", 129, 7],
  ["Organic Cotton Tee", "Apparel", 34, 6],
  ["Selvedge Denim Jeans", "Apparel", 148, 3],
  ["Wool Blend Overcoat", "Apparel", 289, 1.6],
  ["Everyday Chino", "Apparel", 78, 3],
  ["Ribbed Beanie", "Apparel", 28, 2.5],
  ["Quilted Vest", "Apparel", 119, 1.8],
  ["Ceramic Pour-Over Set", "Home & Kitchen", 64, 10],
  ["Cast Iron Skillet", "Home & Kitchen", 72, 5],
  ["Stoneware Mug Set", "Home & Kitchen", 42, 5],
  ["Walnut Cutting Board", "Home & Kitchen", 58, 3],
  ["Linen Table Runner", "Home & Kitchen", 36, 1.6],
  ["Glass Storage Jars", "Home & Kitchen", 39, 2.4],
  ["Chef's Knife 8in", "Home & Kitchen", 118, 2.6],
  ["French Press", "Home & Kitchen", 48, 3],
  ["Wireless Earbuds Pro", "Electronics", 149, 8],
  ["Mechanical Keyboard", "Electronics", 139, 4],
  ["USB-C Travel Hub", "Electronics", 59, 4.5],
  ["Portable Charger 20K", "Electronics", 49, 5],
  ["Smart Desk Lamp", "Electronics", 89, 2.6],
  ["Noise-Cancelling Headphones", "Electronics", 299, 2.2],
  ["Bluetooth Speaker Mini", "Electronics", 69, 3],
  ["Webcam 4K", "Electronics", 129, 1.5],
  ["Waxed Canvas Tote", "Accessories", 95, 7],
  ["Leather Card Wallet", "Accessories", 54, 5],
  ["Brass Desk Lamp", "Accessories", 164, 1.5],
  ["Weekender Duffel", "Accessories", 189, 2.2],
  ["Polarized Sunglasses", "Accessories", 112, 2.6],
  ["Field Notebook 3-Pack", "Accessories", 18, 4],
  ["Canvas Belt", "Accessories", 38, 1.5],
  ["Insulated Water Bottle", "Outdoor", 36, 7],
  ["Trail Running Shoes", "Outdoor", 134, 3.5],
  ["Ultralight Daypack", "Outdoor", 98, 3],
  ["Camp Hammock", "Outdoor", 79, 2.2],
  ["Merino Hiking Socks", "Outdoor", 24, 4],
  ["Titanium Camp Mug", "Outdoor", 32, 2],
  ["Packable Rain Shell", "Outdoor", 159, 2],
  ["Soy Candle Trio", "Wellness", 44, 4.5],
  ["Yoga Mat Pro", "Wellness", 84, 3.4],
  ["Aromatherapy Diffuser", "Wellness", 56, 2.6],
  ["Bamboo Bath Towels", "Wellness", 62, 2.2],
  ["Massage Roller", "Wellness", 29, 2],
  ["Herbal Tea Sampler", "Wellness", 26, 3.4],
  ["Weighted Blanket", "Wellness", 139, 1.8],
  ["Standing Desk Mat", "Wellness", 74, 1.4],
];

/** Share of orders refunded, by category of the order's first item. */
const REFUND_RATE: Record<string, number> = {
  Apparel: 0.095,
  Electronics: 0.06,
  Accessories: 0.035,
  Outdoor: 0.04,
  "Home & Kitchen": 0.025,
  Wellness: 0.02,
};

const REFUND_REASONS: Record<string, [string, number][]> = {
  Apparel: [["Wrong size", 50], ["Changed mind", 22], ["Not as described", 14], ["Arrived late", 8], ["Damaged in transit", 6]],
  Electronics: [["Defective item", 46], ["Not as described", 20], ["Changed mind", 16], ["Damaged in transit", 12], ["Arrived late", 6]],
  default: [["Changed mind", 34], ["Damaged in transit", 26], ["Not as described", 18], ["Arrived late", 14], ["Defective item", 8]],
};

/** Relative order volume per calendar month (0 = January). */
const MONTH_SEASONALITY = [0.88, 0.86, 0.94, 0.98, 1.02, 0.95, 0.9, 0.93, 1.0, 1.06, 1.34, 1.48];

function categorySeasonality(category: string, month: number): number {
  const summer = month >= 4 && month <= 7;
  const winter = month >= 9 || month <= 1;
  if (category === "Outdoor") return summer ? 1.7 : winter ? 0.65 : 1;
  if (category === "Apparel") return winter ? 1.35 : summer ? 0.85 : 1;
  if (category === "Wellness") return month === 0 ? 1.6 : 1; // New Year resolutions
  return 1;
}

/** Black Friday week: the 7 days ending on the last Friday of November + weekend. */
function isBlackFridayWeek(date: Date): boolean {
  if (date.getUTCMonth() !== 10) return false;
  const day = date.getUTCDate();
  return day >= 22 && day <= 30;
}

export function generateDataset(today: Date = new Date()): Dataset {
  const random = createRandom(20261012);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];

  /** Build a picker over weighted items using a cumulative table + binary search. */
  const weightedPicker = <T>(items: readonly T[], weightOf: (item: T) => number) => {
    const cumulative: number[] = [];
    let total = 0;
    for (const item of items) {
      total += Math.max(0, weightOf(item));
      cumulative.push(total);
    }
    return () => {
      const target = random() * total;
      let low = 0;
      let high = cumulative.length - 1;
      while (low < high) {
        const mid = (low + high) >> 1;
        if (cumulative[mid] < target) low = mid + 1;
        else high = mid;
      }
      return items[low];
    };
  };

  const endOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const now = today.getTime();

  // ── Products ────────────────────────────────────────────────────────────
  const products: (ProductRow & { weight: number })[] = CATALOG.map(([name, category, price, weight], index) => {
    // Most of the catalog predates the data window; three items launch during it.
    const launchedDaysAgo = index === 16 ? 150 : index === 37 ? 95 : index === 44 ? 60 : 420 + ((index * 37) % 500);
    return {
      id: index + 1,
      name,
      category,
      price,
      cost: round2(price * (0.38 + random() * 0.2)),
      // Two slow movers were discontinued but still appear in historical orders.
      isActive: index !== 30 && index !== 12,
      launchedAt: isoDate(new Date(endOfToday.getTime() - launchedDaysAgo * DAY_MS)),
      weight,
    };
  });

  // ── Customers ───────────────────────────────────────────────────────────
  const pickRegion = weightedPicker(GEOGRAPHY, (region) => region[1]);
  const usedEmails = new Set<string>();
  const customers: (CustomerRow & { weight: number; sizeFactor: number; signupMs: number })[] = [];

  for (let id = 1; id <= CUSTOMER_COUNT; id++) {
    const [region, , sizeFactor, countries] = pickRegion();
    const [country, cities] = pick(countries);
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const isBusiness = random() < 0.14;
    const name = isBusiness ? `${last} ${pick(BUSINESS_SUFFIXES)}` : `${first} ${last}`;

    const slug = `${first}.${last}`.toLowerCase().normalize("NFD").replace(/[^a-z.]/g, "");
    let email = `${slug}@example.com`;
    for (let n = 2; usedEmails.has(email); n++) email = `${slug}${n}@example.com`;
    usedEmails.add(email);

    // Sign-ups stretch back two years and accelerate towards the present.
    const signupDaysAgo = Math.floor(Math.pow(random(), 1.4) * 730);
    const signupMs = endOfToday.getTime() - signupDaysAgo * DAY_MS;

    // Pareto-ish loyalty: most customers buy once or twice, a few buy constantly.
    const loyalty = Math.pow(random(), 3.2);
    const weight = 0.25 + loyalty * 14 + (isBusiness ? 2.5 : 0);

    customers.push({
      id,
      name,
      email,
      segment: isBusiness ? "business" : "consumer",
      region,
      country,
      city: pick(cities),
      signupDate: isoDate(new Date(signupMs)),
      weight,
      sizeFactor: sizeFactor * (isBusiness ? 1.5 : 1),
      signupMs,
    });
  }

  const pickCustomer = weightedPicker(customers, (customer) => customer.weight);

  // ── Orders, line items, refunds ─────────────────────────────────────────
  const orders: OrderRow[] = [];
  const orderItems: OrderItemRow[] = [];
  const refunds: RefundRow[] = [];
  const pickItemCount = weightedPicker([1, 2, 3, 4, 5], (count) => [36, 30, 19, 10, 5][count - 1]);
  // Orders cluster in the late morning and the evening.
  const pickHour = weightedPicker(
    Array.from({ length: 24 }, (_, hour) => hour),
    (hour) => [1, 1, 1, 1, 1, 2, 3, 5, 7, 9, 10, 10, 9, 8, 7, 7, 8, 9, 11, 12, 11, 8, 5, 2][hour],
  );

  for (let dayIndex = 0; dayIndex < HISTORY_DAYS; dayIndex++) {
    const day = new Date(endOfToday.getTime() - (HISTORY_DAYS - 1 - dayIndex) * DAY_MS);
    const month = day.getUTCMonth();
    const weekday = day.getUTCDay();
    const blackFriday = isBlackFridayWeek(day);

    const growth = 0.78 + (dayIndex / HISTORY_DAYS) * 0.5;
    const weekend = weekday === 0 || weekday === 6 ? 1.22 : weekday === 1 ? 0.92 : 1;
    const expected = 23 * growth * MONTH_SEASONALITY[month] * weekend * (blackFriday ? 1.9 : 1);
    const orderCount = Math.max(1, Math.round(expected * (0.82 + random() * 0.36)));

    const available = products.filter((product) => product.launchedAt <= isoDate(day));
    const pickProduct = weightedPicker(
      available,
      (product) => product.weight * categorySeasonality(product.category, month),
    );
    // Mobile grows from roughly a quarter to nearly half of orders over the year.
    const mobileShare = 0.26 + (dayIndex / HISTORY_DAYS) * 0.2;

    for (let n = 0; n < orderCount; n++) {
      const orderMs = day.getTime() + pickHour() * 3_600_000 + Math.floor(random() * 3_600_000);
      if (orderMs > now) continue;

      // Customers cannot order before they signed up.
      let customer = pickCustomer();
      for (let attempt = 0; attempt < 6 && customer.signupMs > orderMs; attempt++) customer = pickCustomer();
      if (customer.signupMs > orderMs) continue;

      const orderId = orders.length + 1;
      const lineCount = pickItemCount();
      const chosen = new Set<number>();
      let total = 0;
      let leadCategory = "";
      let firstLineValue = 0;

      for (let line = 0; line < lineCount; line++) {
        const product = pickProduct();
        if (chosen.has(product.id)) continue;
        chosen.add(product.id);

        const bulk = random() < 0.18 * customer.sizeFactor;
        const quantity = bulk ? 2 + Math.floor(random() * 3) : 1;
        const discount = blackFriday ? 0.75 : random() < 0.07 ? 0.9 : 1;
        const unitPrice = round2(product.price * discount);

        orderItems.push({ id: orderItems.length + 1, orderId, productId: product.id, quantity, unitPrice });
        total += quantity * unitPrice;
        if (!leadCategory) {
          leadCategory = product.category;
          firstLineValue = quantity * unitPrice;
        }
      }

      const ageDays = (now - orderMs) / DAY_MS;
      const channelRoll = random();
      const channel = channelRoll < mobileShare ? "mobile" : channelRoll < mobileShare + 0.11 ? "marketplace" : "web";

      let status = "completed";
      if (ageDays < 2) status = "processing";
      else if (ageDays < 6) status = "shipped";
      else if (random() < 0.03) status = "cancelled";
      else if (random() < (REFUND_RATE[leadCategory] ?? 0.03)) {
        const fullRefund = random() < 0.7;
        const refundMs = Math.min(now, orderMs + (3 + random() * 18) * DAY_MS);
        const reasons = REFUND_REASONS[leadCategory] ?? REFUND_REASONS.default;
        refunds.push({
          id: refunds.length + 1,
          orderId,
          amount: round2(fullRefund ? total : firstLineValue),
          reason: weightedPicker(reasons, (reason) => reason[1])()[0],
          refundedAt: new Date(refundMs).toISOString(),
        });
        if (fullRefund) status = "refunded";
      }

      orders.push({
        id: orderId,
        customerId: customer.id,
        orderDate: new Date(orderMs).toISOString(),
        status,
        channel,
        totalAmount: round2(total),
      });
    }
  }

  return {
    // Drop the generator-only helper fields before returning rows.
    customers: customers.map(({ id, name, email, segment, region, country, city, signupDate }) => ({
      id, name, email, segment, region, country, city, signupDate,
    })),
    products: products.map(({ id, name, category, price, cost, isActive, launchedAt }) => ({
      id, name, category, price, cost, isActive, launchedAt,
    })),
    orders,
    orderItems,
    refunds,
  };
}
