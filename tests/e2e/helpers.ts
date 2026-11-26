import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export type Theme = "light" | "dark";
export const themes: Theme[] = ["light", "dark"];

/** Put the page in a theme before it loads (next-themes reads localStorage). */
export async function setTheme(page: Page, theme: Theme, { reducedMotion = true } = {}) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.addInitScript((value) => {
    try {
      localStorage.setItem("theme", value);
    } catch {
      // storage blocked: the emulated colour scheme still applies via "system"
    }
  }, theme);
}

/** Wait until every finite animation on the page has finished (max 3 s). */
export async function settle(page: Page) {
  await page.waitForTimeout(150);
  await page
    .evaluate(() =>
      Promise.race([
        Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
            .map((animation) => animation.finished),
        ),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]),
    )
    .catch(() => {});
}

/** WCAG 2.1 AA scan of the current page state. Fails with a readable summary. */
export async function expectAccessible(page: Page, label: string) {
  await settle(page);
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  // While a modal is open, the page behind it is inert and dimmed by the overlay; scan the modal only.
  if (await page.locator('[role="dialog"][aria-modal="true"]').count()) builder = builder.exclude('[aria-hidden="true"]');
  const results = await builder.analyze();
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n` +
      violation.nodes
        .slice(0, 5)
        .map((node) => `    ${node.target.join(" ")}\n      ${node.failureSummary?.split("\n").join("\n      ")}`)
        .join("\n"),
  );
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

/** The page must never scroll sideways (checked at 390 px wide). */
export async function expectNoHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const wide = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => element.getBoundingClientRect().right > doc.clientWidth + 1)
      .filter((element) => !element.closest("[data-allow-overflow]"))
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 60)}`);
    return { scroll: doc.scrollWidth - doc.clientWidth, wide };
  });
  expect(overflow.scroll, `${label} scrolls sideways; widest: ${overflow.wide.join(", ")}`).toBeLessThanOrEqual(0);
}

/**
 * POST /api/chat is answered locally, so tests never spend AI quota and never
 * write a conversation. Default: a "busy" error, like a 429 from the provider.
 */
export async function mockChat(page: Page, body?: string, status = 429) {
  await page.route("**/api/chat", (route) =>
    body !== undefined
      ? route.fulfill({ status, headers: { "content-type": "application/x-ndjson" }, body })
      : route.fulfill({ status, json: { error: "Mocked in tests: the AI is not called." } }),
  );
}

export const appPages = [
  { path: "/app", label: "Ask" },
  { path: "/app/history", label: "History" },
  { path: "/app/dashboard", label: "Dashboard" },
  { path: "/app/upload", label: "Data" },
] as const;

/** The page is loaded: its nav tab is current and the page has its h1. */
export async function expectPage(page: Page, label: string) {
  // Generous: the test DB is a remote Neon instance.
  await expect(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label, exact: true }),
  ).toHaveAttribute("aria-current", "page", { timeout: 30_000 });
  await expect(page.locator("main h1").first()).toBeVisible({ timeout: 20_000 });
}
