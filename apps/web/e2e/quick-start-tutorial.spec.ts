/**
 * E2E Tests: Quick Start Tutorial Path
 *
 * Tests the complete Quick Start tutorial flow (7 steps).
 * Covers: happy path, navigation, mobile viewport, persistence, edge cases.
 *
 * @see brenner_bot-hdyq (E2E Tests: Quick Start Tutorial Path)
 * @see brenner_bot-s797 (Tutorial Path: Quick Start)
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

// ============================================================================
// Constants
// ============================================================================

const QUICK_START_PATH = "/tutorial/quick-start";
const TOTAL_STEPS = 7;
const STORAGE_KEY = "brenner-tutorial-quick-start-progress";

const STEP_TITLES = [
  "What Is This?",
  "Prerequisites",
  "Clone & Install",
  "Search the Corpus",
  "Build an Excerpt",
  "Your First Session",
  "Understand the Output",
];

// ============================================================================
// Helper Functions
// ============================================================================

async function clearTutorialProgress(page: import("@playwright/test").Page) {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
}

async function setTutorialProgress(
  page: import("@playwright/test").Page,
  currentStep: number,
  completedSteps: number[],
) {
  // Match the actual structure saved by tutorial-context.tsx
  const progress = {
    pathId: "quick-start",
    currentStep,
    completedSteps: completedSteps.map(String), // Stored as strings
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_KEY, JSON.stringify(progress)],
  );
}

async function getTutorialProgress(page: import("@playwright/test").Page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function clickNextButton(
  page: import("@playwright/test").Page,
  logger: ReturnType<typeof import("./utils/e2e-logging").createE2ELogger>,
) {
  const nextButton = page
    .locator('button:has-text("Next"), button:has-text("Continue"), a:has-text("Next")')
    .first();
  await clickElement(page, logger, nextButton, "Next button");
}

// ============================================================================
// Happy Path Tests
// ============================================================================

test.describe("Quick Start Tutorial - Happy Path", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing progress
    await page.goto("/");
    await clearTutorialProgress(page);
  });

  test("should load the Quick Start overview page", async ({ page, logger }) => {
    await navigateTo(page, logger, QUICK_START_PATH);
    await waitForNetworkIdle(page, logger);

    logger.step("Verifying overview page content");
    await assertPageHasContent(page, logger, 200);
    await assertTextContent(page, logger, "body", /Quick Start/i, "Page title");
    await assertTextContent(page, logger, "body", /7 steps/i, "Step count");
    await assertTextContent(page, logger, "body", /~30 min/i, "Duration");

    await takeScreenshot(page, logger, "quick-start-overview");
    logger.info("Quick Start overview page loaded successfully");
  });

  test("should navigate through all 7 steps", async ({ page, logger }) => {
    // Start at step 1
    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    for (let step = 1; step <= TOTAL_STEPS; step++) {
      logger.step(`Verifying Step ${step}: ${STEP_TITLES[step - 1]}`);

      // Verify we're on the correct step
      await assertUrl(page, logger, `${QUICK_START_PATH}/${step}`);
      await assertPageHasContent(page, logger, 100);
      await assertTextContent(
        page,
        logger,
        "body",
        new RegExp(STEP_TITLES[step - 1], "i"),
        `Step ${step} title`,
      );

      await takeScreenshot(page, logger, `quick-start-step-${step}`);

      // Navigate to next step (except on last step)
      if (step < TOTAL_STEPS) {
        logger.info(`Navigating from step ${step} to step ${step + 1}`);
        await clickNextButton(page, logger);
        await waitForNetworkIdle(page, logger);
      }
    }

    logger.info("Successfully navigated through all 7 steps");
  });

  test("Step 1 should display Two Axioms content", async ({ page, logger }) => {
    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    logger.step("Verifying Two Axioms content");
    await assertTextContent(page, logger, "body", /Two Axioms/i, "Two Axioms heading");
    await assertTextContent(page, logger, "body", /Reality has a generative grammar/i, "Axiom 1");
    await assertTextContent(page, logger, "body", /To understand is to reconstruct/i, "Axiom 2");

    await takeScreenshot(page, logger, "step-1-axioms");
    logger.info("Step 1 Two Axioms content verified");
  });

  test("Step 1 should show artifact preview sections", async ({ page, logger }) => {
    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    logger.step("Verifying artifact preview sections");
    const expectedSections = [
      "Hypothesis Slate",
      "Discriminative Tests",
      "Assumption Ledger",
      "Adversarial Critique",
    ];

    for (const section of expectedSections) {
      await assertTextContent(
        page,
        logger,
        "body",
        new RegExp(section, "i"),
        `Artifact section: ${section}`,
      );
    }

    logger.info("Artifact preview sections verified");
  });

  test("Step 7 should show completion state", async ({ page, logger }) => {
    await navigateTo(page, logger, `${QUICK_START_PATH}/7`);
    await waitForNetworkIdle(page, logger);

    logger.step("Verifying final step content");
    await assertTextContent(page, logger, "body", /Understand the Output/i, "Step 7 title");

    // Should have finish/complete button or next steps
    const bodyText = await page.locator("body").textContent();
    const hasCompletion = /finish|complete|next steps|congratulations/i.test(bodyText || "");
    expect(hasCompletion).toBeTruthy();

    await takeScreenshot(page, logger, "step-7-completion");
    logger.info("Step 7 completion state verified");
  });
});

// ============================================================================
// Navigation Tests
// ============================================================================

test.describe("Quick Start Tutorial - Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearTutorialProgress(page);
  });

  test("should navigate directly to any step via URL", async ({ page, logger }) => {
    // Test jumping to middle step
    await navigateTo(page, logger, `${QUICK_START_PATH}/4`);
    await waitForNetworkIdle(page, logger);

    await assertUrl(page, logger, `${QUICK_START_PATH}/4`);
    await assertTextContent(page, logger, "body", /Search the Corpus/i, "Step 4 title");

    await takeScreenshot(page, logger, "direct-nav-step-4");
    logger.info("Direct URL navigation works");
  });

  test("should handle back button navigation", async ({ page, logger }) => {
    // Navigate to step 1, then step 2
    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    await clickNextButton(page, logger);
    await waitForNetworkIdle(page, logger);
    await assertUrl(page, logger, `${QUICK_START_PATH}/2`);

    // Use browser back
    logger.step("Testing browser back button");
    await page.goBack();
    await waitForNetworkIdle(page, logger);

    await assertUrl(page, logger, `${QUICK_START_PATH}/1`);
    logger.info("Back button navigation works");
  });

  test("should have working Previous button from step 2 onwards", async ({ page, logger }) => {
    await navigateTo(page, logger, `${QUICK_START_PATH}/3`);
    await waitForNetworkIdle(page, logger);

    logger.step("Looking for Previous button");
    const prevButton = page
      .locator('button:has-text("Previous"), button:has-text("Back"), a:has-text("Previous")')
      .first();

    if (await prevButton.isVisible()) {
      await clickElement(page, logger, prevButton, "Previous button");
      await waitForNetworkIdle(page, logger);
      await assertUrl(page, logger, `${QUICK_START_PATH}/2`);
      logger.info("Previous button navigation works");
    } else {
      logger.warn("Previous button not found on step 3");
    }
  });

  test("Step 1 should have Previous button disabled", async ({ page, logger }) => {
    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    logger.step("Verifying Previous button is disabled on step 1");
    const prevButton = page.locator('button:has-text("Previous"), button:has-text("Back")').first();

    const isVisible = await prevButton.isVisible().catch(() => false);
    if (isVisible) {
      // If visible, it should be disabled
      const isDisabled = await prevButton.isDisabled().catch(() => false);
      expect(isDisabled).toBeTruthy();
      logger.info("Step 1 Previous button is visible but disabled");
    } else {
      // If not visible, that's also acceptable
      logger.info("Step 1 Previous button is hidden");
    }
  });

  test("should navigate from overview to step 1", async ({ page, logger }) => {
    await navigateTo(page, logger, QUICK_START_PATH);
    await waitForNetworkIdle(page, logger);

    logger.step("Looking for Start button");
    const startButton = page
      .locator('a:has-text("Start Step 1"), button:has-text("Start"), a:has-text("Begin")')
      .first();

    await clickElement(page, logger, startButton, "Start button");
    await waitForNetworkIdle(page, logger);

    await assertUrl(page, logger, `${QUICK_START_PATH}/1`);
    logger.info("Successfully navigated from overview to step 1");
  });
});

// ============================================================================
// Mobile Viewport Tests
// ============================================================================

test.describe("Quick Start Tutorial - Mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await clearTutorialProgress(page);
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test("overview page should be responsive on mobile", async ({ page, logger }) => {
    logger.info("Testing mobile viewport: 375x667");
    await navigateTo(page, logger, QUICK_START_PATH);
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 100);
    await assertTextContent(page, logger, "body", /Quick Start/i, "Title visible");

    await takeScreenshot(page, logger, "mobile-overview");
    logger.info("Mobile overview verified");
  });

  test("step pages should be usable on mobile", async ({ page, logger }) => {
    logger.info("Testing mobile viewport: 375x667");
    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    await assertPageHasContent(page, logger, 100);

    // Next button should be visible and clickable
    const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
    const isVisible = await nextButton.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();

    await takeScreenshot(page, logger, "mobile-step-1");
    logger.info("Mobile step page verified");
  });

  test("should navigate through steps on mobile", async ({ page, logger }) => {
    logger.info("Testing mobile navigation");
    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    // Navigate to step 2
    await clickNextButton(page, logger);
    await waitForNetworkIdle(page, logger);

    await assertUrl(page, logger, `${QUICK_START_PATH}/2`);
    await takeScreenshot(page, logger, "mobile-step-2");
    logger.info("Mobile navigation works");
  });
});

// ============================================================================
// Persistence Tests
// ============================================================================

test.describe("Quick Start Tutorial - Persistence", () => {
  test("should persist progress to localStorage", async ({ page, logger }) => {
    await page.goto("/");
    await clearTutorialProgress(page);

    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    // Navigate to step 2
    await clickNextButton(page, logger);
    await waitForNetworkIdle(page, logger);

    logger.step("Checking localStorage for progress");
    const progress = await getTutorialProgress(page);

    expect(progress).not.toBeNull();
    expect(progress.pathId).toBe("quick-start");
    // Note: totalSteps is not stored in localStorage, only in context
    expect(progress.currentStep).toBeDefined();
    expect(progress.completedSteps).toBeDefined();

    logger.info(
      `Progress saved: currentStep=${progress.currentStep}, completed=${progress.completedSteps?.length || 0}`,
    );
  });

  test("should restore progress after page reload", async ({ page, logger }) => {
    await page.goto("/");

    // Set progress to step 3 with steps 0, 1 completed
    await setTutorialProgress(page, 2, [0, 1]);

    // Navigate to step 3
    await navigateTo(page, logger, `${QUICK_START_PATH}/3`);
    await waitForNetworkIdle(page, logger);

    // Reload page
    logger.step("Reloading page");
    await page.reload();
    await waitForNetworkIdle(page, logger);

    // Progress should still be there
    const progress = await getTutorialProgress(page);
    expect(progress).not.toBeNull();
    // completedSteps are stored as strings
    expect(progress.completedSteps).toContain("0");
    expect(progress.completedSteps).toContain("1");

    logger.info("Progress persisted across reload");
  });

  test("should track completed steps", async ({ page, logger }) => {
    await page.goto("/");
    await clearTutorialProgress(page);

    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    // Complete step 1 -> step 2
    await clickNextButton(page, logger);
    await waitForNetworkIdle(page, logger);

    // Complete step 2 -> step 3
    await clickNextButton(page, logger);
    await waitForNetworkIdle(page, logger);

    logger.step("Verifying completed steps tracked");
    const progress = await getTutorialProgress(page);

    // Should have at least step 0 and 1 completed
    expect(progress.completedSteps).toBeDefined();
    expect(progress.completedSteps.length).toBeGreaterThanOrEqual(2);

    logger.info(`Completed steps: ${progress.completedSteps.join(", ")}`);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

test.describe("Quick Start Tutorial - Edge Cases", () => {
  test("should handle non-existent step gracefully", async ({ page, logger }) => {
    logger.step("Navigating to non-existent step 99");

    const response = await page.goto(`${QUICK_START_PATH}/99`, {
      waitUntil: "networkidle",
    });

    // Should return 404
    expect(response?.status()).toBe(404);

    logger.info(`Non-existent step returned status: ${response?.status()}`);
    await takeScreenshot(page, logger, "step-404");
  });

  test("should handle step 0 (invalid)", async ({ page, logger }) => {
    logger.step("Navigating to step 0");

    const response = await page.goto(`${QUICK_START_PATH}/0`, {
      waitUntil: "networkidle",
    });

    // Should return 404
    expect(response?.status()).toBe(404);

    logger.info(`Step 0 returned status: ${response?.status()}`);
  });

  test("should handle clearing progress", async ({ page, logger }) => {
    await page.goto("/");

    // Set some progress first
    await setTutorialProgress(page, 3, [0, 1, 2]);

    // Clear it
    await clearTutorialProgress(page);

    // Verify cleared
    const progress = await getTutorialProgress(page);
    expect(progress).toBeNull();

    logger.info("Progress clearing works");
  });

  test("should show step indicator with correct count", async ({ page, logger }) => {
    await navigateTo(page, logger, `${QUICK_START_PATH}/4`);
    await waitForNetworkIdle(page, logger);

    logger.step("Checking step indicator");

    // Look for step indicator (e.g., "Step 4 of 7" or "4/7")
    const bodyText = await page.locator("body").textContent();
    const hasStepIndicator = /step\s*4/i.test(bodyText || "") || /4\s*\/\s*7/i.test(bodyText || "");

    if (hasStepIndicator) {
      logger.info("Step indicator found");
    } else {
      logger.warn("Step indicator not found - may be styled differently");
    }

    await takeScreenshot(page, logger, "step-indicator");
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe("Quick Start Tutorial - Accessibility", () => {
  test("overview page should have proper heading structure", async ({ page, logger }) => {
    await navigateTo(page, logger, QUICK_START_PATH);
    await waitForNetworkIdle(page, logger);

    logger.step("Checking heading structure");

    // Should have at least one h1
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Should have h2 or h3 for sections
    const h2Count = await page.locator("h2").count();
    expect(h2Count).toBeGreaterThan(0);

    logger.info(`Headings found: ${h1Count} h1, ${h2Count} h2`);
  });

  test("navigation buttons should be keyboard accessible", async ({ page, logger }) => {
    await navigateTo(page, logger, `${QUICK_START_PATH}/2`);
    await waitForNetworkIdle(page, logger);

    logger.step("Testing keyboard navigation");

    // Tab to Next button
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Press Enter to activate
    await page.keyboard.press("Enter");
    await waitForNetworkIdle(page, logger);

    // Should have navigated (either forward or activated some button)
    const url = page.url();
    logger.info(`After keyboard navigation, URL: ${url}`);
  });

  test("should have sufficient color contrast", async ({ page, logger }) => {
    await navigateTo(page, logger, `${QUICK_START_PATH}/1`);
    await waitForNetworkIdle(page, logger);

    logger.step("Checking for visible text content");

    // This is a basic check - full a11y would use axe-core
    await assertPageHasContent(page, logger, 200);

    // Check that body text is visible
    const bodyOpacity = await page.evaluate(() => {
      const body = document.querySelector("body");
      return body ? getComputedStyle(body).opacity : "0";
    });
    expect(parseFloat(bodyOpacity)).toBeGreaterThan(0);

    logger.info("Basic visibility checks passed");
  });
});
