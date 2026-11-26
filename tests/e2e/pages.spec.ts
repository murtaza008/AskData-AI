import { expect, test } from "@playwright/test";
import { expectAccessible, expectPage, mockChat, setTheme, themes } from "./helpers";

/** Data, Settings and History pages: read-only against the demo account. */

test.beforeEach(async ({ page }) => {
  await mockChat(page);
});

for (const theme of themes) {
  test(`Data page explains every column and passes axe (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto("/app/upload");
    await expectPage(page, "Data");
    const tables = page.getByRole("navigation", { name: "Tables" });
    await tables.getByRole("button", { name: /refunds/ }).click();
    const detail = page.getByRole("region", { name: "refunds", exact: true });
    await expect(detail.getByRole("cell", { name: "reason", exact: true })).toBeVisible();
    await expect(detail.getByRole("link", { name: /refund/i }).first()).toHaveAttribute("href", /^\/app\?q=/);
    await expectAccessible(page, `data page (${theme})`);

    // Hovering a table previews its columns from data the row already has.
    await tables.getByRole("button", { name: /orders/ }).first().hover();
    await expect(page.getByText(/order_date/).first()).toBeVisible();
    await expectAccessible(page, `table hover card (${theme})`);
  });

  test(`Settings shows the real account and usage (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto("/app/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("demo@askdata.app")).toBeVisible();
    await expect(page.getByText(/\d+ of \d+ \(demo limit\)/)).toBeVisible();
    await expect(page.getByText("Shared demo account")).toBeVisible();
    await expectAccessible(page, `settings (${theme})`);
  });
}

test("the demo account can't delete its sample upload", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/app/upload");
  await expectPage(page, "Data");
  await expect(page.getByText("marketing_spend.csv")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete / })).toHaveCount(0);
});

test("settings is reachable from the account menu", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/app/history");
  await expectPage(page, "History");
  await page.getByRole("button", { name: /account menu/i }).click();
  await page.getByRole("menuitem", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
});
