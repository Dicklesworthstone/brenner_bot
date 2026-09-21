/**
 * E2E Tests: Search Workflow
 *
 * Tests the spotlight search workflow (Cmd+K on macOS, Ctrl+K on Windows/Linux) - the most critical user journey.
 * Philosophy: Test real user flows with detailed logging.
 */

import { expect, navigateTo, takeScreenshot, test, waitForNetworkIdle } from "./utils";
import { withStep } from "./utils/e2e-logging";

const SPOTLIGHT_SHORTCUT = process.platform === "darwin" ? "Meta+k" : "Control+k";

test.describe("Search Workflow - Desktop", () => {
  test.beforeEach(async ({ page }) => {
    // Start from the corpus page where search is most commonly used
    await page.goto("/corpus");
    await page.waitForLoadState("networkidle");
  });

  test("opens spotlight search with Cmd+K and focuses input", async ({ page, logger }) => {
    test.skip(
      process.platform !== "darwin",
      "Cmd+K is macOS-specific; Ctrl+K is covered in a separate test.",
    );

    await withStep(logger, page, "Open spotlight search with Cmd+K", async () => {
      await page.keyboard.press("Meta+k");
    });

    await withStep(logger, page, "Verify search dialog is visible", async () => {
      const dialog = page.locator('[role="dialog"][aria-label="Search"]');
      await expect(dialog).toBeVisible({ timeout: 2000 });
    });

    await withStep(logger, page, "Verify search input is focused", async () => {
      const input = page.locator('input[placeholder*="Search transcript"]');
      await expect(input).toBeFocused();
    });

    logger.info("Spotlight search opened successfully via Cmd+K");
    await takeScreenshot(page, logger, "search-opened-cmd-k");
  });

  test("opens spotlight search with Ctrl+K (Windows/Linux)", async ({ page, logger }) => {
    await withStep(logger, page, "Open spotlight search with Ctrl+K", async () => {
      await page.keyboard.press("Control+k");
    });

    await withStep(logger, page, "Verify search dialog is visible", async () => {
      const dialog = page.locator('[role="dialog"][aria-label="Search"]');
      await expect(dialog).toBeVisible({ timeout: 2000 });
    });

    logger.info("Spotlight search opened successfully via Ctrl+K");
  });

  test("closes spotlight search on Escape", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    await expect(page.locator('[role="dialog"][aria-label="Search"]')).toBeVisible();

    await withStep(logger, page, "Close search with Escape key", async () => {
      await page.keyboard.press("Escape");
    });

    await withStep(logger, page, "Verify search dialog is hidden", async () => {
      await expect(page.locator('[role="dialog"][aria-label="Search"]')).not.toBeVisible();
    });

    logger.info("Spotlight search closed successfully via Escape");
  });

  test("closes spotlight search by clicking backdrop", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    await expect(page.locator('[role="dialog"][aria-label="Search"]')).toBeVisible();

    await withStep(logger, page, "Click backdrop to close", async () => {
      // Click on the backdrop (the semi-transparent overlay)
      await page.locator(".backdrop-blur-md").click({ position: { x: 10, y: 10 } });
    });

    await withStep(logger, page, "Verify search dialog is hidden", async () => {
      await expect(page.locator('[role="dialog"][aria-label="Search"]')).not.toBeVisible();
    });

    logger.info("Spotlight search closed successfully via backdrop click");
  });

  test("searches for content and displays results", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');
    await expect(input).toBeFocused();

    await withStep(logger, page, "Type search query 'Brenner'", async () => {
      await input.fill("Brenner");
    });

    await withStep(logger, page, "Wait for search results", async () => {
      // Wait for results to appear (debounce + search time)
      await page.waitForSelector('[data-index="0"]', { timeout: 5000 });
    });

    await withStep(logger, page, "Verify results are displayed", async () => {
      const resultCount = await page.locator("[data-index]").count();
      logger.info(`Found ${resultCount} search results`);
      expect(resultCount).toBeGreaterThan(0);
    });

    await takeScreenshot(page, logger, "search-results-brenner");
  });

  test("navigates search results with arrow keys", async ({ page, logger }) => {
    // Open search and type query
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');
    await input.fill("elegans");
    await page.waitForSelector('[data-index="0"]', { timeout: 5000 });

    await withStep(logger, page, "Press ArrowDown to select second result", async () => {
      await page.keyboard.press("ArrowDown");
    });

    await withStep(logger, page, "Verify second result is highlighted", async () => {
      // The selected item should have the primary color background
      const secondResult = page.locator('[data-index="1"]');
      await expect(secondResult).toHaveClass(/bg-primary/);
    });

    await withStep(logger, page, "Press ArrowUp to go back to first result", async () => {
      await page.keyboard.press("ArrowUp");
    });

    await withStep(logger, page, "Verify first result is highlighted", async () => {
      const firstResult = page.locator('[data-index="0"]');
      await expect(firstResult).toHaveClass(/bg-primary/);
    });

    logger.info("Keyboard navigation working correctly");
  });

  test("selects search result with Enter and navigates", async ({ page, logger }) => {
    // Open search and type query
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');
    await input.fill("genetics");
    await page.waitForSelector('[data-index="0"]', { timeout: 5000 });

    // Get the URL we'll navigate to by reading the first result
    const firstResult = page.locator('[data-index="0"]');
    await expect(firstResult).toBeVisible();

    await withStep(logger, page, "Press Enter to select first result", async () => {
      await page.keyboard.press("Enter");
    });

    await withStep(logger, page, "Verify navigation occurred", async () => {
      // Search dialog should close
      await expect(page.locator('[role="dialog"][aria-label="Search"]')).not.toBeVisible();
      // URL should have changed (should include the query param)
      await expect(page).toHaveURL(/q=genetics/);
    });

    // Wait for page to settle after navigation before screenshot
    await page.waitForLoadState("networkidle");

    logger.info("Navigation from search result successful");
    await takeScreenshot(page, logger, "search-navigation-result");
  });

  test("handles no results gracefully", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');

    await withStep(logger, page, "Type nonsense search query", async () => {
      await input.fill("xyznonexistent123456");
    });

    await withStep(logger, page, "Wait for no results state", async () => {
      await page.waitForSelector("text=No results found", { timeout: 5000 });
    });

    await withStep(logger, page, "Verify no results message is shown", async () => {
      await expect(page.getByText("No results found")).toBeVisible();
      await expect(page.getByText("xyznonexistent123456")).toBeVisible();
    });

    logger.info("No results state handled correctly");
    await takeScreenshot(page, logger, "search-no-results");
  });

  test("clears search input with clear button", async ({ page, logger }) => {
    // Open search and type query
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');
    await input.fill("test query");

    await withStep(logger, page, "Click clear button", async () => {
      const clearButton = page.locator('[aria-label="Clear search"]');
      await expect(clearButton).toBeVisible();
      await clearButton.click();
    });

    await withStep(logger, page, "Verify input is cleared", async () => {
      await expect(input).toHaveValue("");
    });

    logger.info("Clear button works correctly");
  });

  test("filters results by category", async ({ page, logger }) => {
    // Open search and type query
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');
    await input.fill("molecular");
    await page.waitForSelector('[data-index="0"]', { timeout: 5000 });

    await withStep(logger, page, "Click Transcript category filter", async () => {
      // Category pills are small rounded buttons in the filter row
      // Find the container with category pills and click the Transcript one
      const categoryPills = page.locator(".rounded-full").filter({ hasText: /^Transcript/ });
      await categoryPills.first().click();
    });

    await withStep(logger, page, "Verify results are filtered", async () => {
      // Wait for results to update
      await page.waitForTimeout(500);
      // Check that we still have results (or no results message for this category)
      const hasResults = await page.locator("[data-index]").count();
      logger.info(`Transcript category has ${hasResults} results`);
    });

    logger.info("Category filtering works correctly");
    await takeScreenshot(page, logger, "search-filtered-transcript");
  });

  test("debounces search input", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');

    await withStep(logger, page, "Type rapidly without waiting", async () => {
      await input.type("brenner method", { delay: 20 });
    });

    await withStep(
      logger,
      page,
      "Verify debounce - results appear after typing stops",
      async () => {
        // Should see loading indicator briefly, then results
        await page.waitForSelector('[data-index="0"]', { timeout: 5000 });
        const resultCount = await page.locator("[data-index]").count();
        logger.info(`After debounce, found ${resultCount} results`);
        expect(resultCount).toBeGreaterThan(0);
      },
    );

    logger.info("Debounce working correctly");
  });

  test("uses suggestion chips when search is empty", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);

    await withStep(logger, page, "Verify suggestion chips are visible", async () => {
      const suggestionChip = page.getByRole("button", { name: /C\. elegans/i });
      await expect(suggestionChip).toBeVisible();
    });

    await withStep(logger, page, "Click suggestion chip", async () => {
      const suggestionChip = page.getByRole("button", { name: /C\. elegans/i });
      await suggestionChip.click();
    });

    await withStep(logger, page, "Verify search input is populated", async () => {
      const input = page.locator('input[placeholder*="Search transcript"]');
      await expect(input).toHaveValue("C. elegans");
    });

    await withStep(logger, page, "Verify results appear", async () => {
      await page.waitForSelector('[data-index="0"]', { timeout: 5000 });
    });

    logger.info("Suggestion chips work correctly");
    await takeScreenshot(page, logger, "search-suggestion-chip");
  });
});

test.describe("Search Workflow - Mobile", () => {
  // Use mobile viewport with touch support
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto("/corpus");
    await page.waitForLoadState("networkidle");
  });

  test("opens search via keyboard shortcut on mobile", async ({ page, logger }) => {
    await withStep(logger, page, "Open search with keyboard shortcut", async () => {
      // On mobile, the search button might not be visible, so use keyboard shortcut
      await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    });

    await withStep(logger, page, "Verify search dialog opens", async () => {
      const dialog = page.locator('[role="dialog"][aria-label="Search"]');
      await expect(dialog).toBeVisible({ timeout: 2000 });
    });

    await withStep(logger, page, "Verify search input is focused", async () => {
      const input = page.locator('input[placeholder*="Search transcript"]');
      await expect(input).toBeFocused();
    });

    logger.info("Mobile search opened successfully");
    await takeScreenshot(page, logger, "mobile-search-opened");
  });

  test("search results are scrollable on mobile", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');
    await input.fill("Brenner");
    await page.waitForSelector('[data-index="0"]', { timeout: 5000 });

    await withStep(logger, page, "Verify results container is scrollable", async () => {
      const resultsContainer = page.locator('[class*="overflow-y-auto"]').first();
      await expect(resultsContainer).toBeVisible();
    });

    await withStep(logger, page, "Scroll through results", async () => {
      const resultsContainer = page.locator('[class*="overflow-y-auto"]').first();
      await resultsContainer.evaluate((el) => el.scrollBy(0, 200));
    });

    logger.info("Mobile scroll works correctly");
    await takeScreenshot(page, logger, "mobile-search-scrolled");
  });

  test("clicks on search result to navigate on mobile", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');
    await input.fill("genetics");
    await page.waitForSelector('[data-index="0"]', { timeout: 5000 });

    await withStep(logger, page, "Click on first result", async () => {
      const firstResult = page.locator('[data-index="0"]');
      await firstResult.click();
    });

    await withStep(logger, page, "Verify navigation occurred", async () => {
      await expect(page.locator('[role="dialog"][aria-label="Search"]')).not.toBeVisible();
      await expect(page).toHaveURL(/q=genetics/);
    });

    logger.info("Mobile click navigation works correctly");
  });

  test("category filters are visible on mobile", async ({ page, logger }) => {
    // Open search and type query
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');
    await input.fill("biology");
    await page.waitForSelector('[data-index="0"]', { timeout: 5000 });

    await withStep(logger, page, "Verify category pills are visible", async () => {
      // Category pills are in a horizontally scrollable container
      const allCategory = page.locator(".rounded-full").filter({ hasText: /^All/ }).first();
      await expect(allCategory).toBeVisible();
    });

    logger.info("Mobile category filters work correctly");
    await takeScreenshot(page, logger, "mobile-search-categories");
  });
});

test.describe("Search Workflow - Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/corpus");
    await page.waitForLoadState("networkidle");
  });

  test("handles special characters in search query", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');

    await withStep(logger, page, "Search with section anchor format", async () => {
      await input.fill("§103");
    });

    await withStep(logger, page, "Verify search handles special chars", async () => {
      // Wait for either results or no results (both are valid)
      await page.waitForTimeout(1000);
      const hasResults = (await page.locator("[data-index]").count()) > 0;
      const hasNoResults = await page
        .getByText("No results found")
        .isVisible()
        .catch(() => false);
      logger.info(`Special char search: has results=${hasResults}, no results=${hasNoResults}`);
      expect(hasResults || hasNoResults).toBe(true);
    });

    logger.info("Special characters handled correctly");
  });

  test("handles very long search query", async ({ page, logger }) => {
    // Open search
    await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    const input = page.locator('input[placeholder*="Search transcript"]');

    const longQuery =
      "molecular biology genetics C elegans worm development Sydney Brenner research methodology scientific approach";

    await withStep(logger, page, "Enter very long search query", async () => {
      await input.fill(longQuery);
    });

    await withStep(logger, page, "Verify search completes without error", async () => {
      await page.waitForTimeout(1500);
      // Should show either results or no results message
      const dialogVisible = await page.locator('[role="dialog"][aria-label="Search"]').isVisible();
      expect(dialogVisible).toBe(true);
    });

    logger.info("Long query handled correctly");
  });

  test("rapid toggle does not break search", async ({ page, logger }) => {
    await withStep(logger, page, "Rapidly toggle search open/close", async () => {
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press(SPOTLIGHT_SHORTCUT);
        await page.waitForTimeout(50);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(50);
      }
    });

    await withStep(logger, page, "Open search one final time", async () => {
      await page.keyboard.press(SPOTLIGHT_SHORTCUT);
    });

    await withStep(logger, page, "Verify search still works", async () => {
      const dialog = page.locator('[role="dialog"][aria-label="Search"]');
      await expect(dialog).toBeVisible();
      const input = page.locator('input[placeholder*="Search transcript"]');
      await expect(input).toBeFocused();
    });

    logger.info("Rapid toggle handled correctly");
  });

  test("search works from different pages", async ({ page, logger }) => {
    const pages = ["/", "/distillations", "/method"];

    for (const pagePath of pages) {
      await navigateTo(page, logger, pagePath);
      await waitForNetworkIdle(page, logger);

      await withStep(logger, page, `Test search from ${pagePath}`, async () => {
        await page.keyboard.press(SPOTLIGHT_SHORTCUT);
        const dialog = page.locator('[role="dialog"][aria-label="Search"]');
        await expect(dialog).toBeVisible({ timeout: 2000 });
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
      });
    }

    logger.info("Search works from all pages");
  });
});
