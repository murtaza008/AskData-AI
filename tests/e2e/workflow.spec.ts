import { expect, type Page, test } from "@playwright/test";
import { expectAccessible, expectPage, setTheme, themes } from "./helpers";

/*
 * The core workflow: ask a question, read the answer, check the evidence,
 * pin it. /api/chat is always mocked (no AI calls, nothing stored) and so is
 * creating a pin; everything else reads the demo account's real data.
 */

const CONVERSATION = "7f0c2a3e-1b2c-4d5e-8f90-a1b2c3d4e5f6";
const QUESTION = "What were our top 5 products by revenue last month?";
const SQL = "SELECT p.name AS product, sum(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN products p ON p.id = oi.product_id GROUP BY p.name ORDER BY revenue DESC LIMIT 5";

const steps = [
  { id: "schema-0", kind: "schema", status: "ok", label: "Read schema · 6 tables", atMs: 4 },
  { id: "query-1", kind: "query", status: "error", label: "Query failed", detail: 'column "p.title" does not exist', atMs: 1800, sql: "SELECT p.title" },
  { id: "query-2", kind: "fix", status: "ok", label: "Fixed query · returned 5 rows · 41ms", atMs: 3100, sql: SQL },
  { id: "answer", kind: "answer", status: "ok", label: "Wrote answer", atMs: 4200 },
];

const answer = {
  status: "answered",
  insight: "**Wireless Earbuds Pro** led last month with **$16,688**, ahead of the Ceramic Pour-Over Set.",
  chart: { type: "bar", x: "product", y: "revenue", title: "Revenue by product", yFormat: "currency" },
  sql: SQL,
  columns: [
    { name: "product", kind: "text" },
    { name: "revenue", kind: "number" },
  ],
  rows: [
    { product: "Wireless Earbuds Pro", revenue: 16688 },
    { product: "Ceramic Pour-Over Set", revenue: 12345.6 },
    { product: "Linen Overshirt", revenue: 11774.7 },
    { product: "Merino Crew Sweater", revenue: 11468.1 },
    { product: "Noise-Cancelling Headphones", revenue: 11272.3 },
  ],
  rowCount: 5,
  truncated: false,
  steps,
  followUps: ["Which categories do these products belong to?"],
  durationMs: 4300,
  model: "google:gemini-flash-latest",
};

const ndjson = (...events: unknown[]) => events.map((event) => JSON.stringify(event)).join("\n") + "\n";

async function mockAnswer(page: Page) {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
      body: ndjson(
        { type: "start", conversationId: CONVERSATION },
        ...steps.map((step) => ({ type: "step", step })),
        { type: "answer", turnId: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f", answer },
      ),
    }),
  );
  // Pinning is answered locally: tests never write.
  await page.route("**/api/pins", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 201,
          json: { pin: { id: "pin-test", title: "Revenue by product", question: QUESTION, sql: SQL, chart: answer.chart, createdAt: new Date().toISOString() } },
        })
      : route.continue(),
  );
}

async function ask(page: Page, question = QUESTION) {
  await page.goto("/app");
  await expectPage(page, "Ask");
  await page.getByRole("textbox", { name: "Your question" }).fill(question);
  await page.keyboard.press("Enter");
}

for (const theme of themes) {
  test(`ask, read the answer and check the evidence (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await mockAnswer(page);
    await ask(page);

    await expect(page.getByText(/led last month with/)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/app/c/${CONVERSATION}$`));
    await expect(page.getByRole("heading", { level: 1, name: QUESTION })).toBeVisible();
    const result = page.getByRole("region", { name: "Result: Revenue by product" });
    await expect(result.getByText("Wireless Earbuds Pro").first()).toBeVisible();
    await expectAccessible(page, `answer (${theme})`);

    // The trace shows the self-correction.
    await page.getByRole("button", { name: /queries · 4\.3s/ }).click();
    await expect(page.getByText('column "p.title" does not exist')).toBeVisible();
    await expect(page.getByText("self-corrected").first()).toBeVisible();

    // Same rows as a table, then the SQL that ran.
    await result.getByRole("radio", { name: "table" }).click();
    await expect(result.getByRole("table")).toBeVisible();
    await expect(result.getByRole("row")).toHaveCount(6);
    await result.getByRole("button", { name: "SQL that ran" }).click();
    await expect(result.locator("pre code")).toContainText("ORDER BY revenue DESC");
    await expectAccessible(page, `evidence open (${theme})`);
  });
}

test("pinning is instant and says where it went", async ({ page }) => {
  await setTheme(page, "light");
  await mockAnswer(page);
  await ask(page);
  await expect(page).toHaveURL(new RegExp(`/app/c/${CONVERSATION}$`));
  const result = page.getByRole("region", { name: "Result: Revenue by product" });
  await result.getByRole("button", { name: "Pin to dashboard" }).click();
  await expect(result.getByRole("button", { name: "Pinned" })).toBeDisabled();
  await expect(page.getByText("Pinned to the dashboard")).toBeVisible();
});

test("the chart type can be switched", async ({ page }) => {
  await setTheme(page, "light");
  await mockAnswer(page);
  await ask(page);
  await expect(page).toHaveURL(new RegExp(`/app/c/${CONVERSATION}$`));
  const result = page.getByRole("region", { name: "Result: Revenue by product" });
  await result.getByRole("radio", { name: "Pie chart" }).click();
  await expect(result.getByRole("radio", { name: "Pie chart" })).toHaveAttribute("aria-checked", "true");
  await expect(result.getByText("%").first()).toBeVisible();
});

test("busy model (503): the reason is shown with a retry", async ({ page }) => {
  await setTheme(page, "light");
  await page.route("**/api/chat", (route) =>
    route.fulfill({ status: 503, json: { error: "The AI provider is temporarily overloaded. Please try again in a few seconds." } }),
  );
  await ask(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("temporarily overloaded");
  await expect(page.getByRole("button", { name: "Ask again" })).toBeVisible();
  await expectAccessible(page, "busy error");
});

test("bad request (400): the real message is shown inline", async ({ page }) => {
  await setTheme(page, "light");
  await page.route("**/api/chat", (route) => route.fulfill({ status: 400, json: { error: "Keep questions under 500 characters." } }));
  await ask(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Keep questions under 500 characters.");
});

test("a provider error during the run is shown, not hidden", async ({ page }) => {
  await setTheme(page, "light");
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
      body: ndjson(
        { type: "start", conversationId: CONVERSATION },
        {
          type: "answer",
          turnId: "x",
          answer: { ...answer, status: "error", insight: "The AI provider rejected the API key. Check the key in your environment variables.", chart: null, sql: null, rows: [], columns: [] },
        },
      ),
    }),
  );
  await ask(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("rejected the API key");
});

test("stop cancels the question", async ({ page }) => {
  await setTheme(page, "light");
  // Never answers: the request stays open until the user stops it.
  await page.route("**/api/chat", () => {});
  await ask(page);
  await expect(page.getByText("Working on it…")).toBeVisible();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText("You stopped this question")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask", exact: true })).toBeVisible();
});

test("a saved conversation opens with its chart and table (read-only)", async ({ page }) => {
  await setTheme(page, "dark");
  await page.goto("/app/history");
  await expectPage(page, "History");
  const link = page.getByRole("link", { name: "Break down revenue by region" });
  await link.hover();
  await expect(page.getByText(/question(s)? *$/).first()).toBeVisible();
  await link.click();
  await expect(page.getByRole("heading", { level: 1, name: "Break down revenue by region" })).toBeVisible();
  await expect(page.getByRole("region", { name: /^Result:/ }).first()).toBeVisible();
  await expectAccessible(page, "saved conversation (dark)");
});
