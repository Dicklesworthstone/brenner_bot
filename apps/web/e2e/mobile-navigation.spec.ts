/**
 * E2E Tests: Mobile Navigation and Hamburger Menu
 *
 * Covers bottom navigation on small viewports and the tutorial mobile menu toggle.
 * Philosophy: Test real user flows with detailed logging.
 */

import {
  assertPageHasContent,
  assertUrl,
  clickElement,
  expect,
  navigateTo,
  takeScreenshot,
  test,
  waitForContent,
  waitForNetworkIdle,
} from "./utils";

test.describe("Mobile Navigation", () => {
  test("should render bottom nav and navigate on mobile", async ({ page, logger }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    logger.info("Set mobile viewport: 375x667");

    await navigateTo(page, logger, "/");
    await waitForNetworkIdle(page, logger);
    await assertPageHasContent(page, logger, 100);

    const bottomNav = page.locator("nav.bottom-nav");
    await expect(bottomNav).toBeVisible();

    const navItems = bottomNav.locator("[data-nav-item]");
    const navCount = await navItems.count();
    logger.info(`Bottom nav item count: ${navCount}`);
    expect(navCount).toBeGreaterThan(4);

    const corpusLink = bottomNav.locator('a[href="/corpus"]').first();
    if (await corpusLink.isVisible()) {
      await clickElement(page, logger, corpusLink, "Bottom nav: Corpus");
      await waitForNetworkIdle(page, logger);
      await assertUrl(page, logger, "/corpus");
    } else {
      logger.warn("Bottom nav corpus link not visible on mobile");
    }

    await takeScreenshot(page, logger, "mobile-bottom-nav");
  });
});

test.describe("Mobile Tutorial Menu", () => {
  test("should open and close the tutorial hamburger menu on mobile", async ({ page, logger }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    logger.info("Set mobile viewport: 375x667");

    await navigateTo(page, logger, "/tutorial/quick-start/1");
    await waitForNetworkIdle(page, logger);
    await assertPageHasContent(page, logger, 100);

    const menuButton = page.locator('button:has-text("Quick Start")').first();
    await waitForContent(page, logger, 'button:has-text("Quick Start")');
    await expect(menuButton).toBeVisible();

    await clickElement(page, logger, menuButton, "Tutorial menu button");
    await waitForContent(page, logger, 'text="All Tutorials"');
    await takeScreenshot(page, logger, "tutorial-mobile-menu-open");

    const overlay = page
      .locator('div[class*="inset-0"][class*="z-50"][class*="lg:hidden"]')
      .first();
    const closeButton = overlay.locator("button").first();
    if (await closeButton.isVisible()) {
      await clickElement(page, logger, closeButton, "Tutorial menu close button");
    } else {
      logger.warn("Tutorial menu close button not visible; attempting to close via backdrop");
      const backdrop = page.locator('[class*="bg-black/60"]').first();
      await clickElement(page, logger, backdrop, "Tutorial menu backdrop");
    }

    await expect(overlay).toBeHidden();
    await takeScreenshot(page, logger, "tutorial-mobile-menu-closed");
  });
});
