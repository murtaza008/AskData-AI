import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { mockChat, setTheme, settle, themes } from "./helpers";

/**
 * Screenshots for review (SCREENS=review, the default) into SCREENS_DIR, and
 * for the README / landing page (SCREENS=marketing) into public/screens.
 * Signed in as the read-only demo account; the AI is mocked.
 */
const dir = process.env.SCREENS_DIR ?? "tests/e2e/.results/screens";
const only = process.env.SHOTS?.split(",");

async function shot(page: Page, name: string) {
  mkdirSync(dir, { recursive: true });
  await settle(page);
  await page.screenshot({ path: path.join(dir, `${name}.png`) });
}

const pages = [
  { name: "ask", path: "/app" },
  { name: "history", path: "/app/history" },
  { name: "dashboard", path: "/app/dashboard" },
  { name: "data", path: "/app/upload" },
];

test.describe.configure({ mode: "parallel" });

for (const theme of themes) {
  for (const { name, path: url } of pages) {
    if (only && !only.includes(name)) continue;
    test(`review ${name} ${theme}`, async ({ page }) => {
      await mockChat(page);
      await setTheme(page, theme);
      await page.goto(url);
      await expect(page.locator("main h1").first()).toBeVisible({ timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      await shot(page, `${name}-${theme}`);
    });
  }

  test(`review shell overlays ${theme}`, async ({ page }) => {
    test.skip(Boolean(only && !only.includes("shell")));
    await mockChat(page);
    await setTheme(page, theme);
    await page.goto("/app/history");
    await page.waitForLoadState("networkidle");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" }).hover();
    await expect(page.getByText("Key store metrics for the last 30 days")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await shot(page, `hover-nav-${theme}`);
    await page.mouse.move(700, 600);
    await page.getByRole("button", { name: /^Notifications/ }).click();
    await shot(page, `notifications-${theme}`);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /account menu/i }).click();
    await shot(page, `account-${theme}`);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await shot(page, `palette-${theme}`);
  });

  test(`review mobile ${theme}`, async ({ browser }) => {
    test.skip(Boolean(only && !only.includes("mobile")));
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      storageState: "tests/e2e/.auth/demo.json",
    });
    const page = await context.newPage();
    await mockChat(page);
    await setTheme(page, theme);
    await page.goto("/app/dashboard");
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");
    await shot(page, `mobile-dashboard-${theme}`);
    await page.getByRole("button", { name: "Open menu" }).click();
    await shot(page, `mobile-drawer-${theme}`);
    await context.close();
  });
}

test("review mid-animation frame", async ({ page }) => {
  test.skip(Boolean(only && !only.includes("motion")));
  await mockChat(page);
  await setTheme(page, "light", { reducedMotion: false });
  await page.goto("/app/history");
  await page.waitForLoadState("networkidle");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" }).click();
  await page.waitForTimeout(120);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, "mid-animation.png") });
});
