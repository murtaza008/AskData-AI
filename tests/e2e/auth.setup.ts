import { expect, test as setup } from "@playwright/test";

const DEMO = { email: "demo@askdata.app", password: "askdata-demo" };

/** Signs in to the shared demo account once (through the real login form) and saves the session. */
setup("sign in as the demo account", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO.email);
  await page.getByLabel("Password").fill(DEMO.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.waitForURL(/\/app/, { timeout: 60_000 });
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await page.context().storageState({ path: "tests/e2e/.auth/demo.json" });
});
