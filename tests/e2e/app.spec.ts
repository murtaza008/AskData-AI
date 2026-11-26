import { expect, test } from "@playwright/test";
import { appPages, expectAccessible, expectNoHorizontalScroll, expectPage, mockChat, setTheme, settle, themes } from "./helpers";

/** App shell: navigation, menus, palette and drawer, in both themes. Read-only. */

test.beforeEach(async ({ page }) => {
  await mockChat(page);
});

for (const theme of themes) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await setTheme(page, theme);
    });

    for (const { path, label } of appPages) {
      test(`${label} page passes axe`, async ({ page }) => {
        await page.goto(path);
        await expectPage(page, label);
        await expectAccessible(page, `${path} (${theme})`);
      });
    }

    test("account and notification menus pass axe", async ({ page }) => {
      await page.goto("/app/history");
      await expectPage(page, "History");

      await page.getByRole("button", { name: /account menu/i }).click();
      const account = page.getByRole("menu");
      await expect(account.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
      await expectAccessible(page, `account menu (${theme})`);
      await page.keyboard.press("Escape");
      await expect(account).toBeHidden();

      await page.getByRole("button", { name: /^Notifications/ }).click();
      const notifications = page.getByRole("menu");
      await expect(notifications.getByRole("menuitem").first()).toBeVisible();
      await expectAccessible(page, `notifications (${theme})`);
    });

    test("nav hover card shows what the page is for, with live counts", async ({ page }) => {
      await page.goto("/app/history");
      await expectPage(page, "History");
      await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" }).hover();
      const card = page.getByText("Key store metrics for the last 30 days");
      await expect(card).toBeVisible();
      await expect(page.getByText("Pinned charts", { exact: true })).toBeVisible();
      await expectAccessible(page, `nav hover card (${theme})`);
    });

    test("command palette opens with Ctrl+K and passes axe", async ({ page }) => {
      await page.goto("/app/history");
      await expectPage(page, "History");
      await page.keyboard.press("Control+k");
      const dialog = page.getByRole("dialog", { name: "Search and commands" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("option").first()).toBeVisible();
      await expectAccessible(page, `command palette (${theme})`);
    });
  });
}

test("command palette jumps to a page", async ({ page }) => {
  await page.goto("/app/history");
  await expectPage(page, "History");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("dashb");
  await page.keyboard.press("Enter");
  await expectPage(page, "Dashboard");
});

test("tabs navigate and the active tab follows", async ({ page }) => {
  await page.goto("/app");
  await expectPage(page, "Ask");
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "History" }).click();
  await expectPage(page, "History");
  await nav.getByRole("link", { name: "Data" }).click();
  await expectPage(page, "Data");
});

test("demo account sees no delete or rename in history", async ({ page }) => {
  await page.goto("/app/history");
  await expectPage(page, "History");
  await expect(page.getByText(/shared demo account, so conversations can't be renamed/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Delete:/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Rename:/ })).toHaveCount(0);
});

test.describe("mobile (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  for (const { path, label } of appPages) {
    test(`${label} does not scroll sideways`, async ({ page }) => {
      await setTheme(page, "light");
      await page.goto(path);
      await expect(page.locator("main h1").first()).toBeVisible({ timeout: 30_000 });
      await settle(page);
      await expectNoHorizontalScroll(page, path);
    });
  }

  for (const theme of themes) {
    test(`drawer opens and passes axe (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto("/app/dashboard");
      await page.getByRole("button", { name: "Open menu" }).click();
      const drawer = page.getByRole("dialog", { name: "Menu" });
      await expect(drawer.getByRole("link", { name: /History/ })).toBeVisible();
      await expectAccessible(page, `mobile drawer (${theme})`);
      await drawer.getByRole("link", { name: /History/ }).click();
      await expect(page).toHaveURL(/\/app\/history$/);
      await expect(page.locator("main h1", { hasText: "History" })).toBeVisible();
    });
  }
});
