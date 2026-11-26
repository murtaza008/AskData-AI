import { expect, type Page, test } from "@playwright/test";
import { expectAccessible, expectNoHorizontalScroll, setTheme, settle, themes } from "./helpers";

/** Scroll the whole page in steps so every reveal and the 3D story run. */
async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await settle(page);
}

test("the headline is server-rendered", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain("Ask");
  expect(html).toMatch(/<h1[^>]*>[\s\S]*database[\s\S]*<\/h1>/);
  // The still picture of the story is in the HTML before any JavaScript runs.
  expect(html).toContain("Bar chart: top 5 products by revenue");
});

for (const theme of themes) {
  test(`landing logs no console errors and passes axe (${theme})`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await setTheme(page, theme, { reducedMotion: false });
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await scrollThrough(page);
    // The 3D scene loaded and took over from the still picture.
    await expect(page.locator("[data-story]")).toHaveAttribute("data-scene-ready", "");
    expect(errors, "console errors (hydration mismatches show up here)").toEqual([]);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expectAccessible(page, `landing (${theme})`);
  });
}

test("the validator demo runs the real validator", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/#demos");
  const demo = page.locator("#demos");
  await demo.getByRole("radio", { name: "Drop a table" }).click();
  await expect(demo.getByText("Rejected before it reaches the database")).toBeVisible();
  await demo.getByRole("radio", { name: "Read password hashes" }).click();
  await expect(demo.getByText(/app\.user" does not exist or is not accessible/i)).toBeVisible();
  await demo.getByRole("radio", { name: "A normal question" }).click();
  await expect(demo.getByText("Allowed: one SELECT on allowed tables")).toBeVisible();
  await expect(demo.getByText(/LIMIT 501/)).toBeVisible();
});

test("the CSV and chart demos run the app's code", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/#demos");
  const demo = page.locator("#demos");
  await expect(demo.getByRole("row", { name: /week_start date/ })).toBeVisible();
  await expect(demo.getByRole("row", { name: /spend number/ })).toBeVisible();
  await demo.getByRole("radio", { name: "Pie of 11 months" }).click();
  await expect(demo.getByText('{"type":"bar","x":"month","y":"revenue"}')).toBeVisible();
  await demo.getByRole("radio", { name: "A single number" }).click();
  await expect(demo.getByText(/"type":"table"/)).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the story shows its still picture and every caption", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("img", { name: /Bar chart: top 5 products/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You get the answer, the chart and the SQL." })).toBeVisible();
  });
});

test.describe("mobile (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test("landing does not scroll sideways", async ({ page }) => {
    await setTheme(page, "light");
    await page.goto("/");
    await scrollThrough(page);
    await expectNoHorizontalScroll(page, "/");
  });
});
