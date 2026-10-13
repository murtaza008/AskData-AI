/**
 * Evaluation cases for the agent.
 *
 * The seed data is anchored to "today", so hard-coded expected numbers would
 * go stale. Instead each case carries a hand-written GOLD query: the eval runs
 * it to get the true answer, then checks that the agent's result contains it.
 *
 * Check types:
 *   scalar        – gold returns one number; it must appear in the agent's result
 *   top-labels    – gold returns ordered labels; the agent's result must contain
 *                   them, in the same order
 *   label-values  – gold returns (label, number) pairs; each label's number must
 *                   appear in the agent's row for that label
 *   unanswerable  – the agent must decline (status "unanswerable"), not guess
 */

export type EvalCase =
  | { id: string; question: string; check: "scalar"; gold: string; tolerance?: number }
  | { id: string; question: string; check: "top-labels"; gold: string }
  | { id: string; question: string; check: "label-values"; gold: string; tolerance?: number }
  | { id: string; question: string; check: "unanswerable" };

/** Revenue convention taught by the schema comments: exclude cancelled and refunded orders. */
const VALID = "o.status NOT IN ('cancelled', 'refunded')";
const LAST_MONTH =
  "o.order_date >= date_trunc('month', now()) - interval '1 month' AND o.order_date < date_trunc('month', now())";

export const EVAL_CASES: EvalCase[] = [
  {
    id: "total-customers",
    question: "How many customers do we have?",
    check: "scalar",
    gold: "SELECT count(*) FROM customers",
  },
  {
    id: "active-products",
    question: "How many active products are in the catalog?",
    check: "scalar",
    gold: "SELECT count(*) FROM products WHERE is_active",
  },
  {
    id: "revenue-last-month",
    question: "What was our total revenue last month?",
    check: "scalar",
    gold: `SELECT round(sum(o.total_amount), 2) FROM orders o WHERE ${VALID} AND ${LAST_MONTH}`,
  },
  {
    id: "orders-last-month",
    question: "How many orders were placed last month, excluding cancelled and refunded ones?",
    check: "scalar",
    gold: `SELECT count(*) FROM orders o WHERE ${VALID} AND ${LAST_MONTH}`,
  },
  {
    id: "aov-overall",
    question: "What is our average order value across all non-cancelled, non-refunded orders?",
    check: "scalar",
    gold: `SELECT round(avg(o.total_amount), 2) FROM orders o WHERE ${VALID}`,
    tolerance: 0.01,
  },
  {
    id: "top-products-last-month",
    question: "What were our top 5 products by revenue last month?",
    check: "top-labels",
    gold: `SELECT p.name
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           JOIN products p ON p.id = oi.product_id
           WHERE ${VALID} AND ${LAST_MONTH}
           GROUP BY p.name ORDER BY sum(oi.quantity * oi.unit_price) DESC LIMIT 5`,
  },
  {
    id: "revenue-by-region",
    question: "Break down revenue by region",
    check: "label-values",
    gold: `SELECT c.region, round(sum(o.total_amount), 2)
           FROM orders o JOIN customers c ON c.id = o.customer_id
           WHERE ${VALID} GROUP BY c.region`,
  },
  {
    id: "monthly-revenue",
    question: "How has monthly revenue trended over the last 6 full months?",
    check: "label-values",
    gold: `SELECT to_char(date_trunc('month', o.order_date), 'YYYY-MM'), round(sum(o.total_amount), 2)
           FROM orders o
           WHERE ${VALID}
             AND o.order_date >= date_trunc('month', now()) - interval '6 months'
             AND o.order_date < date_trunc('month', now())
           GROUP BY 1`,
  },
  {
    id: "orders-by-channel",
    question: "How many orders came through each sales channel? Count every order regardless of status.",
    check: "label-values",
    gold: "SELECT channel, count(*) FROM orders GROUP BY channel",
  },
  {
    id: "aov-by-channel",
    question: "What is the average order value by sales channel?",
    check: "label-values",
    gold: `SELECT o.channel, round(avg(o.total_amount), 2) FROM orders o WHERE ${VALID} GROUP BY o.channel`,
    tolerance: 0.01,
  },
  {
    id: "top-city-customers",
    question: "Which 3 cities have the most customers?",
    check: "top-labels",
    gold: "SELECT city FROM customers GROUP BY city ORDER BY count(*) DESC, city LIMIT 3",
  },
  {
    id: "repeat-customers",
    question: "How many customers have placed more than 3 orders in total, counting every order regardless of status?",
    check: "scalar",
    gold: "SELECT count(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING count(*) > 3) repeaters",
  },
  {
    id: "refund-reasons",
    question: "What are the most common refund reasons, and how many refunds had each?",
    check: "label-values",
    gold: "SELECT reason, count(*) FROM refunds GROUP BY reason",
  },
  {
    id: "top-category",
    question: "Which product category generated the most revenue overall?",
    check: "top-labels",
    gold: `SELECT p.category
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           JOIN products p ON p.id = oi.product_id
           WHERE ${VALID}
           GROUP BY p.category ORDER BY sum(oi.quantity * oi.unit_price) DESC LIMIT 1`,
  },
  {
    id: "business-customers",
    question: "How many of our customers are in the business segment?",
    check: "scalar",
    gold: "SELECT count(*) FROM customers WHERE segment = 'business'",
  },
  {
    id: "unanswerable-marketing",
    question: "How much did we spend on marketing last quarter?",
    check: "unanswerable",
  },
  {
    id: "unanswerable-delivery",
    question: "What is the average delivery time by city?",
    check: "unanswerable",
  },
];
