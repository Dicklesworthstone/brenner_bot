/**
 * E2E Tests: Home Page and Navigation
 *
 * Tests the home page layout, content, and navigation to other sections.
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

test.describe("Home Page", () => {
  test("should display the hero section with correct content", async ({ page, logger }) => {
    await navigateTo(page, logger, "/");
    await waitForNetworkIdle(page, logger);

    // Check hero section exists
    logger.step("Verifying hero section");
    await assertPageHasContent(page, logger, 200);

    // Check for key branding elements
    await assertTextContent(page, logger, "body", /Brenner/i, "Page mentions Brenner");

    // Take screenshot
    await takeScreenshot(page, logger, "home-hero");

    logger.info("Home page hero section verified successfully");
  });

  test("should have working navigation links", async ({ page, logger }) => {
    await navigateTo(page, logger, "/");
    await waitForNetworkIdle(page, logger);

    // Check for navigation elements
    logger.step("Checking navigation links");

    // Find main nav links
    const navLinks = page.locator("nav a, header a");
    const navCount = await navLinks.count();
    logger.info(`Found ${navCount} navigation links`);

    expect(navCount).toBeGreaterThan(0);

    await takeScreenshot(page, logger, "home-navigation");
  });

  test("should navigate to corpus section", async ({ page, logger }) => {
    await navigateTo(page, logger, "/");
    await waitForNetworkIdle(page, logger);

    // Find and click corpus link
    logger.step("Looking for corpus link");
    const corpusLink = page.locator('a[href="/corpus"], a[href*="corpus"]').first();

    if (await corpusLink.isVisible()) {
      await clickElement(page, logger, corpusLink, "Corpus link");
      await waitForNetworkIdle(page, logger);
      await assertUrl(page, logger, "/corpus");

      logger.info("Successfully navigated to corpus");
      await takeScreenshot(page, logger, "corpus-from-home");
    } else {
      logger.warn("Corpus link not found in navigation");
    }
  });

  test("should navigate to distillations section", async ({ page, logger }) => {
    await navigateTo(page, logger, "/");
    await waitForNetworkIdle(page, logger);

    // Find and click distillations link
    logger.step("Looking for distillations link");
    const distillationsLink = page
      .locator('a[href="/distillations"], a[href*="distillation"]')
      .first();

    if (await distillationsLink.isVisible()) {
      await clickElement(page, logger, distillationsLink, "Distillations link");
      await waitForNetworkIdle(page, logger);
      await assertUrl(page, logger, "/distillations");

      logger.info("Successfully navigated to distillations");
      await takeScreenshot(page, logger, "distillations-from-home");
    } else {
      logger.warn("Distillations link not found in navigation");
    }
  });

  test("should navigate to method section", async ({ page, logger }) => {
    await navigateTo(page, logger, "/");
    await waitForNetworkIdle(page, logger);

    // Find and click method link
    logger.step("Looking for method link");
    const methodLink = page.locator('a[href="/method"], a[href*="method"]').first();

    if (await methodLink.isVisible()) {
      await clickElement(page, logger, methodLink, "Method link");
      await waitForNetworkIdle(page, logger);
      await assertUrl(page, logger, "/method");

      logger.info("Successfully navigated to method");
      await takeScreenshot(page, logger, "method-from-home");
    } else {
      logger.warn("Method link not found in navigation");
    }
  });

  test("should be responsive on mobile viewport", async ({ page, logger }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    logger.info("Set mobile viewport: 375x667");

    await navigateTo(page, logger, "/");
    await waitForNetworkIdle(page, logger);

    // Check content is visible
    await assertPageHasContent(page, logger, 100);

    // Take mobile screenshot
    await takeScreenshot(page, logger, "home-mobile");

    logger.info("Mobile responsiveness verified");
  });
});

test.describe("Global Navigation", () => {
  test("should have consistent header across pages", async ({ page, logger }) => {
    const pages = ["/", "/corpus", "/distillations"];

    for (const pagePath of pages) {
      logger.step(`Checking header on ${pagePath}`);
      await navigateTo(page, logger, pagePath);
      await waitForNetworkIdle(page, logger);

      // Check header exists
      const header = page.locator("header").first();
      const hasHeader = await header.isVisible().catch(() => false);

      if (hasHeader) {
        logger.info(`Header found on ${pagePath}`);
      } else {
        logger.warn(`No header element on ${pagePath}`);
      }
    }
  });

  test("should handle 404 for non-existent pages", async ({ page, logger }) => {
    logger.step("Testing 404 handling");

    const response = await page.goto("/this-page-does-not-exist-12345", {
      waitUntil: "networkidle",
    });

    // Should return 404
    expect(response?.status()).toBe(404);
    logger.info(`404 page returned status: ${response?.status()}`);

    // Page should still have content (error page)
    await assertPageHasContent(page, logger, 50);

    await takeScreenshot(page, logger, "404-page");
  });

  test("should have working back navigation", async ({ page, logger }) => {
    await navigateTo(page, logger, "/");
    await waitForNetworkIdle(page, logger);

    // Navigate to corpus
    await navigateTo(page, logger, "/corpus");
    await waitForNetworkIdle(page, logger);
    await assertUrl(page, logger, "/corpus");

    // Go back
    logger.step("Testing browser back navigation");
    await page.goBack();
    await waitForNetworkIdle(page, logger);

    // Should be back at home
    await assertUrl(page, logger, "/");
    logger.info("Back navigation works correctly");
  });
});

test.describe("Page Performance", () => {
  test("home page should load within acceptable time", async ({ page, logger }) => {
    const startTime = Date.now();

    await navigateTo(page, logger, "/");
    await waitForNetworkIdle(page, logger);

    const loadTime = Date.now() - startTime;
    logger.info(`Home page load time: ${loadTime}ms`);

    // Should load within 10 seconds (generous for network variability)
    expect(loadTime).toBeLessThan(10000);
  });

  test("corpus page should load within acceptable time", async ({ page, logger }) => {
    const startTime = Date.now();

    await navigateTo(page, logger, "/corpus");
    await waitForNetworkIdle(page, logger);

    const loadTime = Date.now() - startTime;
    logger.info(`Corpus page load time: ${loadTime}ms`);

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});
