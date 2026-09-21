import { expect, test } from "@playwright/test";

/**
 * Comprehensive page tests for Brenner Bot
 * Takes screenshots of all pages in desktop and mobile views
 */

const PAGES = [
  { path: "/", name: "home" },
  { path: "/corpus", name: "corpus-index" },
  { path: "/corpus/initial-metaprompt", name: "initial-metaprompt" },
  { path: "/corpus/metaprompt", name: "metaprompt" },
  { path: "/corpus/distillation-opus-45", name: "distillation-opus" },
  { path: "/corpus/distillation-gpt-52", name: "distillation-gpt" },
  { path: "/corpus/distillation-gemini-3", name: "distillation-gemini" },
  { path: "/distillations", name: "distillations" },
];

// Protected pages that return 404 without auth
const PROTECTED_PAGES = [{ path: "/sessions/new", name: "sessions-new" }];

// Large pages that may timeout on full screenshot (or exceed 32767px height limit)
const LARGE_PAGES = [
  { path: "/corpus/transcript", name: "transcript" },
  { path: "/corpus/quote-bank", name: "quote-bank" },
  { path: "/distillations/compare", name: "distillations-compare" },
  { path: "/method", name: "method" },
];

test.describe("Page Screenshots", () => {
  for (const page of PAGES) {
    test(`should render ${page.name} correctly`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: "networkidle" });

      // Wait for content to be visible
      await p.waitForTimeout(1000);

      // Take full page screenshot
      await p.screenshot({
        path: `./screenshots/${page.name}.png`,
        fullPage: true,
      });

      // Check that the page has content (not blank)
      const bodyText = await p.locator("body").textContent();
      expect(bodyText?.length).toBeGreaterThan(100);
    });
  }
});

test.describe("Initial Metaprompt Deep Check", () => {
  test("should display metaprompt content", async ({ page }) => {
    await page.goto("/corpus/initial-metaprompt", { waitUntil: "networkidle" });

    // Wait for the page to fully load
    await page.waitForTimeout(2000);

    // Screenshot the page
    await page.screenshot({
      path: "./screenshots/initial-metaprompt-debug.png",
      fullPage: true,
    });

    // Check for specific content that should be visible
    const pageContent = await page.locator("body").textContent();

    // The metaprompt should mention "Sydney Brenner" or "transcripts"
    const hasExpectedContent =
      pageContent?.includes("Sydney Brenner") ||
      pageContent?.includes("transcripts") ||
      pageContent?.includes("hypotheses") ||
      pageContent?.includes("experiments");

    expect(hasExpectedContent).toBe(true);

    // Take a screenshot of just the main content area
    const mainContent = page.locator("main").first();
    if (await mainContent.isVisible()) {
      await mainContent.screenshot({
        path: "./screenshots/initial-metaprompt-content.png",
      });
    }
  });
});

test.describe("Protected Pages", () => {
  for (const page of PROTECTED_PAGES) {
    test(`${page.name} should return 404 without auth`, async ({ page: p }) => {
      const response = await p.goto(page.path, { waitUntil: "networkidle" });

      // Protected pages intentionally return 404 to unauthorized users
      expect(response?.status()).toBe(404);

      await p.screenshot({
        path: `./screenshots/${page.name}.png`,
        fullPage: true,
      });
    });
  }
});

test.describe("Large Pages", () => {
  for (const page of LARGE_PAGES) {
    test(`${page.name} should load and have content`, async ({ page: p }) => {
      await p.goto(page.path, { waitUntil: "networkidle" });
      await p.waitForTimeout(2000);

      // Check content exists without full-page screenshot (too large)
      const bodyText = await p.locator("body").textContent();
      expect(bodyText?.length).toBeGreaterThan(1000);

      // Take viewport screenshot instead of full page
      await p.screenshot({
        path: `./screenshots/${page.name}-viewport.png`,
      });
    });
  }
});

test.describe("Content Visibility Checks", () => {
  test("corpus index should show document cards", async ({ page }) => {
    await page.goto("/corpus", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Should have multiple document links
    const docLinks = page.locator('a[href^="/corpus/"]');
    const count = await docLinks.count();
    expect(count).toBeGreaterThan(3);

    await page.screenshot({
      path: "./screenshots/corpus-cards.png",
      fullPage: true,
    });
  });

  test("distillations should show model cards", async ({ page }) => {
    await page.goto("/distillations", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Should have the three model cards
    const content = await page.locator("body").textContent();
    expect(content).toContain("Opus");
    expect(content).toContain("GPT");
    expect(content).toContain("Gemini");

    await page.screenshot({
      path: "./screenshots/distillations-cards.png",
      fullPage: true,
    });
  });

  test("method page should have content", async ({ page }) => {
    await page.goto("/method", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const content = await page.locator("body").textContent();
    expect(content?.length).toBeGreaterThan(500);

    await page.screenshot({
      path: "./screenshots/method-content.png",
      fullPage: true,
    });
  });
});
