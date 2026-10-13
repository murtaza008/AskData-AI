/**
 * The public demo account. These credentials are intentionally not secret:
 * they are printed on the login page so a visitor can try the product without
 * signing up. The account can only do what any user can — ask read-only
 * questions — and is rate limited (see DEMO_DAILY_QUESTIONS).
 */
export const DEMO_ACCOUNT = {
  name: "Demo Analyst",
  email: "demo@askdata.app",
  password: "askdata-demo",
} as const;

/** Starter questions shown on the landing page and the empty chat. */
export const SUGGESTED_QUESTIONS = [
  "What were our top 5 products by revenue last month?",
  "How has monthly revenue trended over the last 12 months?",
  "Break down revenue by region",
  "Which product categories have the highest refund rate?",
  "How many customers ordered more than 3 times this year?",
  "What is the average order value by sales channel?",
  "Which cities have the most customers?",
  "How much did we spend on marketing last quarter?",
] as const;
