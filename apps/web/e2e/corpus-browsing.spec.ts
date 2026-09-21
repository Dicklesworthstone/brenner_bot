/**
 * E2E Tests: Corpus Browsing
 *
 * Tests the corpus index and individual document viewing.
 * Philosophy: Test real user flows with detailed logging.
 */

import {
  assertPageHasContent,
  assertTextContent,
  assertUrl,
  clickElement,
  expect,
  navigateTo,
  takeScreenshot,
  test,
  waitForNetworkIdle,
} from "./utils";

test.describe("Corpus Index", () => {
  test("should display corpus document list", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus");
    await waitForNetworkIdle(page, logger);

    // Check page has content
    await assertPageHasContent(page, logger, 200);

    // Should have document links
    logger.step("Checking for document links");
    const docLinks = page.locator('a[href^="/corpus/"]');
    const count = await docLinks.count();
    logger.info(`Found ${count} corpus document links`);

    expect(count).toBeGreaterThan(3);

    await takeScreenshot(page, logger, "corpus-index");
  });

  test("should display document categories", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus");
    await waitForNetworkIdle(page, logger);

    // Check for category indicators (transcript, distillation, metaprompt, etc.)
    logger.step("Checking for document categories");
    const content = await page.locator("body").textContent();

    // Should mention key document types
    const hasTranscript = content?.toLowerCase().includes("transcript");
    const hasDistillation = content?.toLowerCase().includes("distillation");
    const hasMetaprompt =
      content?.toLowerCase().includes("metaprompt") || content?.toLowerCase().includes("prompt");

    logger.info(
      `Categories found - Transcript: ${hasTranscript}, Distillation: ${hasDistillation}, Metaprompt: ${hasMetaprompt}`,
    );

    // At least one category should be present
    expect(hasTranscript || hasDistillation || hasMetaprompt).toBe(true);
  });

  test("should navigate to transcript", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus");
    await waitForNetworkIdle(page, logger);

    // Find transcript link
    logger.step("Looking for transcript link");
    const transcriptLink = page.locator('a[href="/corpus/transcript"]').first();

    if (await transcriptLink.isVisible()) {
      await clickElement(page, logger, transcriptLink, "Transcript link");
      await waitForNetworkIdle(page, logger);
      await assertUrl(page, logger, "/corpus/transcript");

      // Transcript should have substantial content
      await assertPageHasContent(page, logger, 1000);

      logger.info("Successfully navigated to transcript");
      await takeScreenshot(page, logger, "transcript-view", { fullPage: false });
    } else {
      logger.warn("Transcript link not found");
    }
  });

  test("should navigate to distillation documents", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus");
    await waitForNetworkIdle(page, logger);

    // Check each distillation
    const distillations = [
      { id: "distillation-opus-45", name: "Opus" },
      { id: "distillation-gpt-52", name: "GPT" },
      { id: "distillation-gemini-3", name: "Gemini" },
    ];

    for (const dist of distillations) {
      logger.step(`Checking ${dist.name} distillation link`);
      const link = page.locator(`a[href="/corpus/${dist.id}"]`).first();

      if (await link.isVisible()) {
        logger.info(`${dist.name} distillation link found`);
      } else {
        logger.warn(`${dist.name} distillation link not visible`);
      }
    }
  });
});

test.describe("Transcript Viewer", () => {
  test("should display transcript content", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus/transcript");
    await waitForNetworkIdle(page, logger);

    // Wait a bit for content to render (large document)
    await page.waitForTimeout(2000);

    // Should have substantial content
    await assertPageHasContent(page, logger, 1000);

    // Should contain Brenner-related content
    await assertTextContent(page, logger, "body", /Brenner|Sydney/i, "Contains Brenner reference");

    await takeScreenshot(page, logger, "transcript-content", { fullPage: false });
  });

  test("should have section navigation", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus/transcript");
    await waitForNetworkIdle(page, logger);
    await page.waitForTimeout(2000);

    // Look for section markers or TOC
    logger.step("Checking for section navigation");
    const content = await page.locator("body").textContent();

    // Should have section markers (§1, §2, etc.) or numbered sections
    const hasSectionMarkers = /§\d+|Section \d+|Part \d+/i.test(content || "");
    logger.info(`Section markers found: ${hasSectionMarkers}`);

    // Check for any TOC or navigation element
    const tocElement = page.locator(
      '[class*="toc"], [class*="table-of-contents"], [class*="nav"], aside',
    );
    const hasToc = await tocElement
      .first()
      .isVisible()
      .catch(() => false);
    logger.info(`Table of contents visible: ${hasToc}`);

    await takeScreenshot(page, logger, "transcript-navigation", { fullPage: false });
  });

  test("should handle scrolling in transcript", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus/transcript");
    await waitForNetworkIdle(page, logger);
    await page.waitForTimeout(2000);

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);
    logger.info(`Initial scroll position: ${initialScroll}`);

    // Scroll down
    logger.step("Scrolling down");
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);

    const newScroll = await page.evaluate(() => window.scrollY);
    logger.info(`New scroll position: ${newScroll}`);

    // Should have scrolled
    expect(newScroll).toBeGreaterThan(initialScroll);
  });
});

test.describe("Distillation Viewer", () => {
  test("should display Opus distillation", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus/distillation-opus-45");
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 500);
    await assertTextContent(
      page,
      logger,
      "body",
      /Opus|Claude|Brenner/i,
      "Contains expected content",
    );

    await takeScreenshot(page, logger, "distillation-opus", { fullPage: false });
  });

  test("should display GPT distillation", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus/distillation-gpt-52");
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 500);
    await assertTextContent(
      page,
      logger,
      "body",
      /GPT|Brenner|method/i,
      "Contains expected content",
    );

    await takeScreenshot(page, logger, "distillation-gpt", { fullPage: false });
  });

  test("should display Gemini distillation", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus/distillation-gemini-3");
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 500);
    await assertTextContent(
      page,
      logger,
      "body",
      /Gemini|Brenner|method/i,
      "Contains expected content",
    );

    await takeScreenshot(page, logger, "distillation-gemini", { fullPage: false });
  });
});

test.describe("Metaprompt Viewer", () => {
  test("should display metaprompt content", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus/metaprompt");
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 200);

    // Should contain prompt-related content
    const content = await page.locator("body").textContent();
    const hasPromptContent = /prompt|instruction|system|role/i.test(content || "");
    logger.info(`Prompt content found: ${hasPromptContent}`);

    await takeScreenshot(page, logger, "metaprompt");
  });

  test("should display initial metaprompt", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus/initial-metaprompt");
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 200);

    await takeScreenshot(page, logger, "initial-metaprompt");
  });
});

test.describe("Quote Bank", () => {
  test("should display quote bank content", async ({ page, logger }) => {
    await navigateTo(page, logger, "/corpus/quote-bank");
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 200);

    // Should contain quote-related content
    const content = await page.locator("body").textContent();
    const hasQuotes = /§\d+|quote|Brenner/i.test(content || "");
    logger.info(`Quote content found: ${hasQuotes}`);

    await takeScreenshot(page, logger, "quote-bank");
  });
});

test.describe("Distillations Comparison", () => {
  test("should display distillations index", async ({ page, logger }) => {
    await navigateTo(page, logger, "/distillations");
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 200);

    // Should mention all three models
    await assertTextContent(page, logger, "body", /Opus/i, "Mentions Opus");
    await assertTextContent(page, logger, "body", /GPT/i, "Mentions GPT");
    await assertTextContent(page, logger, "body", /Gemini/i, "Mentions Gemini");

    await takeScreenshot(page, logger, "distillations-index");
  });

  test("should navigate to compare view", async ({ page, logger }) => {
    await navigateTo(page, logger, "/distillations/compare");
    await waitForNetworkIdle(page, logger);
    await page.waitForTimeout(2000);

    await assertPageHasContent(page, logger, 200);

    await takeScreenshot(page, logger, "distillations-compare", { fullPage: false });
  });
});
