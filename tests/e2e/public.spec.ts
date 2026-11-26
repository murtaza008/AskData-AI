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

test("a 'Try the demo' link puts focus on the one-click demo sign-in", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/login?demo=1");
  await expect(page.getByRole("button", { name: "Continue with the demo account" })).toBeFocused();
});

test("a wrong password shows a readable error", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("don't match an account");
});

test("sign-up validates before sending anything", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/at least 8 characters|Enter your name|valid email/i).first()).toBeVisible();
});
