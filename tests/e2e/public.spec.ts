import { expect, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, setTheme, themes } from "./helpers";

const pages = [
  { path: "/login", heading: /log in/i },
  { path: "/signup", heading: /create/i },
  { path: "/this-page-does-not-exist", heading: /doesn.t exist|not found/i },
];

for (const theme of themes) {
  for (const { path, heading } of pages) {
    test(`${path} passes axe (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expectAccessible(page, `${path} (${theme})`);
    });
  }
}

test.describe("mobile (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  for (const { path, heading } of pages) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await setTheme(page, "light");
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expectNoHorizontalScroll(page, path);
    });
  }
});
