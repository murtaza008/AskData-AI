import { expect, test } from "@playwright/test";
import { expectAccessible, expectPage, mockChat, setTheme, themes } from "./helpers";

/** Dashboard: real figures from the demo store, read-only. */

test.beforeEach(async ({ page }) => {
  await mockChat(page);
});

test("the period switch reloads the figures and the label says which dates", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/app/dashboard");
  await expectPage(page, "Dashboard");
  const periods = page.getByRole("radiogroup", { name: "Period" });
  await expect(periods.getByRole("radio", { name: "30 days" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/the last 30 days of data, compared with the 30 days before/)).toBeVisible();

  const revenue = page.getByRole("region", { name: "Revenue", exact: true }).locator("[data-value]").first();
  const thirty = Number(await revenue.getAttribute("data-value"));
  expect(thirty).toBeGreaterThan(0);

  await periods.getByRole("radio", { name: "7 days" }).click();
  await expect(page.getByText(/the last 7 days of data/)).toBeVisible();
  await expect(revenue).not.toHaveAttribute("data-value", String(thirty));
  const seven = Number(await revenue.getAttribute("data-value"));
  expect(seven).toBeGreaterThan(0);
  expect(seven).toBeLessThan(thirty);
});

test("every chart has a table view", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/app/dashboard");
  await expectPage(page, "Dashboard");
  const panel = page.getByRole("region", { name: "Categories by revenue" });
  await panel.getByRole("radio", { name: "Table view" }).click();
  await expect(panel.getByRole("table")).toBeVisible();
  await expect(panel.getByRole("columnheader", { name: "Change" })).toBeVisible();
  expect(await panel.getByRole("row").count()).toBeGreaterThan(2);
});

for (const theme of themes) {
  test(`KPI breakdown opens on hover and on keyboard focus (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto("/app/dashboard");
    await expectPage(page, "Dashboard");
    const orders = page.getByRole("group", { name: /^Orders:/ });
    await orders.hover();
    await expect(page.getByText("By sales channel.").first()).toBeVisible();
    await expectAccessible(page, `KPI hover card (${theme})`);
    await page.mouse.move(5, 500);
    await expect(page.getByText("By sales channel.")).toHaveCount(0);

    await orders.focus();
    await expect(page.getByText("By sales channel.").first()).toBeVisible();
  });

  test(`pinned chart menu explains what the demo can't do (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto("/app/dashboard");
    await expectPage(page, "Dashboard");
    const first = page.getByRole("button", { name: /^More for / }).first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Refresh now" })).toBeVisible();
    await expect(menu.getByText(/Unpinning is off in the shared demo/)).toBeVisible();
    await expectAccessible(page, `pinned chart menu (${theme})`);
  });
}

test("a pinned chart shows its SQL", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/app/dashboard");
  await expectPage(page, "Dashboard");
  const view = page.getByRole("radiogroup", { name: /^View for / }).first();
  await view.scrollIntoViewIfNeeded();
  await view.getByRole("radio", { name: "SQL" }).click();
  await expect(page.locator("pre code").first()).toContainText(/select/i);
});

test("'Worth a look' links ask a follow-up question", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/app/dashboard");
  await expectPage(page, "Dashboard");
  await page.getByRole("radiogroup", { name: "Period" }).getByRole("radio", { name: "90 days" }).click();
  await expect(page.getByText(/the last 90 days of data/)).toBeVisible();
  const attention = page.getByRole("region", { name: "Worth a look" });
  const ask = attention.getByRole("link", { name: "Ask why" });
  // Either there are moves worth a look, each with a question, or the list says there are none.
  await expect(ask.first().or(attention.getByText(/moved more than 15%/))).toBeVisible();
  if ((await ask.count()) > 0) await expect(ask.first()).toHaveAttribute("href", /^\/app\?q=/);
});
