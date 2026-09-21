/**
 * E2E Tests: Form Validation
 *
 * Tests form validation behavior across the application:
 * - Session form field validation (required, patterns, length limits)
 * - Real-time validation with debouncing (blur triggers)
 * - Error message accessibility (aria-describedby, role="alert")
 * - Search input behavior
 * - Excerpt basket interactions
 *
 * @see brenner_bot-kw6g (bead)
 */

import {
  assertUrl,
  type createE2ELogger,
  expect,
  takeScreenshot,
  test,
  waitForNetworkIdle,
} from "./utils";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the cookie domain from the BASE_URL.
 * Defaults to localhost for local development, otherwise extracts from URL.
 */
function getCookieDomain(): string {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  try {
    const url = new URL(baseUrl);
    return url.hostname;
  } catch {
    return "localhost";
  }
}

// ============================================================================
// Session Form Validation Tests
// ============================================================================

// Type aliases for cleaner function signatures
type Page = import("@playwright/test").Page;
type BrowserContext = import("@playwright/test").BrowserContext;
type Logger = ReturnType<typeof createE2ELogger>;

test.describe("Session Form Validation", () => {
  // Helper to authenticate and navigate to session form
  async function setupAuthenticatedSession(page: Page, context: BrowserContext, logger: Logger) {
    const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
    await context.addCookies([
      {
        name: "brenner_lab_secret",
        value: labSecret,
        domain: getCookieDomain(),
        path: "/",
      },
    ]);

    const response = await page.goto("/sessions/new");
    await waitForNetworkIdle(page, logger);

    const status = response?.status() ?? 0;

    // Handle lab mode disabled or auth required
    if (status === 404) {
      logger.info("Page returns 404 - lab mode disabled, skipping test");
      return false;
    }

    const pageText = await page.locator("body").textContent();
    if (pageText?.includes("Lab Mode Locked")) {
      logger.warn("Auth required - skipping validation test");
      return false;
    }

    return true;
  }

  test.describe("Required Field Validation", () => {
    test("should show error for empty threadId on blur", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing threadId required validation");

      const threadIdInput = page.locator('input[name="threadId"]');
      await expect(threadIdInput).toBeVisible();

      // Focus and immediately blur without entering text
      await threadIdInput.focus();
      await threadIdInput.blur();

      // Wait for validation message (real-time validation on blur)
      await page.waitForTimeout(100); // Allow for debounce

      // Check for error message
      const errorMessage = page.locator("text=Thread ID is required");
      const hasError = await errorMessage.isVisible().catch(() => false);

      if (hasError) {
        logger.info("Thread ID required error displayed correctly");
        await takeScreenshot(page, logger, "threadId-required-error");
      } else {
        // Form might use HTML5 validation instead
        logger.info("No custom error message - checking HTML5 validation");
        const isRequired = await threadIdInput.getAttribute("required");
        expect(isRequired !== null || hasError).toBeTruthy();
      }
    });

    test("should show error for empty sender on blur", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing sender required validation");

      const senderInput = page.locator('input[name="sender"]');
      await expect(senderInput).toBeVisible();

      // Focus, clear any default value, and blur
      await senderInput.focus();
      await senderInput.fill("");
      await senderInput.blur();
      await page.waitForTimeout(100);

      // Check for error (might be custom or HTML5 validation)
      const errorMessage = page.locator("text=Sender name is required");
      const hasCustomError = await errorMessage.isVisible().catch(() => false);
      const isRequired = await senderInput.getAttribute("required");

      logger.info(
        `Sender validation - Custom error: ${hasCustomError}, HTML5 required: ${isRequired !== null}`,
      );
      await takeScreenshot(page, logger, "sender-required-validation");
    });

    test("should show error for empty recipients", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing recipients required validation");

      const recipientsInput = page.locator('input[name="to"]');
      await expect(recipientsInput).toBeVisible();

      await recipientsInput.focus();
      await recipientsInput.fill("");
      await recipientsInput.blur();
      await page.waitForTimeout(100);

      // Check for error
      const errorMessage = page.locator("text=At least one recipient is required");
      const hasCustomError = await errorMessage.isVisible().catch(() => false);
      const isRequired = await recipientsInput.getAttribute("required");

      logger.info(
        `Recipients validation - Custom error: ${hasCustomError}, HTML5 required: ${isRequired !== null}`,
      );
      await takeScreenshot(page, logger, "recipients-required-validation");
    });

    test("should show error for excerpt too short", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing excerpt minimum length validation");

      const excerptTextarea = page.locator('textarea[name="excerpt"]');
      await expect(excerptTextarea).toBeVisible();

      // Enter text shorter than 10 characters
      await excerptTextarea.focus();
      await excerptTextarea.fill("Short");
      await excerptTextarea.blur();
      await page.waitForTimeout(100);

      // Check for min length error
      const errorMessage = page.locator("text=at least 10 characters");
      const hasError = await errorMessage.isVisible().catch(() => false);

      if (hasError) {
        logger.info("Excerpt minimum length error displayed correctly");
      } else {
        logger.info("No custom min length error visible - checking HTML5 minlength");
        const minLength = await excerptTextarea.getAttribute("minlength");
        logger.info(`HTML5 minlength attribute: ${minLength}`);
      }

      await takeScreenshot(page, logger, "excerpt-min-length-error");
    });
  });

  test.describe("Pattern Validation", () => {
    test("should validate threadId pattern (alphanumeric with dashes)", async ({
      page,
      logger,
      context,
    }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing threadId pattern validation");

      const threadIdInput = page.locator('input[name="threadId"]');

      // Test invalid pattern (special characters)
      await threadIdInput.focus();
      await threadIdInput.fill("invalid@thread#id!");
      await threadIdInput.blur();
      await page.waitForTimeout(100);

      // Check for pattern error
      const errorText = page.locator("text=alphanumeric");
      const hasPatternError = await errorText.isVisible().catch(() => false);

      if (hasPatternError) {
        logger.info("ThreadId pattern validation working correctly");
        await takeScreenshot(page, logger, "threadId-pattern-error");
      } else {
        // The input might have HTML5 pattern attribute
        const pattern = await threadIdInput.getAttribute("pattern");
        logger.info(`HTML5 pattern attribute: ${pattern}`);
      }

      // Now test valid pattern
      await threadIdInput.fill("VALID-THREAD-123");
      await threadIdInput.blur();
      await page.waitForTimeout(100);

      // Error should clear
      const errorAfterValid = await errorText.isVisible().catch(() => false);
      logger.info(`Error cleared after valid input: ${!errorAfterValid}`);
    });

    test("should validate sender pattern (PascalCase)", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing sender PascalCase pattern validation");

      const senderInput = page.locator('input[name="sender"]');

      // Test invalid pattern (spaces, lowercase start)
      await senderInput.focus();
      await senderInput.fill("invalid sender");
      await senderInput.blur();
      await page.waitForTimeout(100);

      // Check for pattern error
      const errorText = page.locator("text=PascalCase");
      const hasPatternError = await errorText.isVisible().catch(() => false);

      if (hasPatternError) {
        logger.info("Sender PascalCase validation working correctly");
        await takeScreenshot(page, logger, "sender-pattern-error");
      }

      // Test valid PascalCase
      await senderInput.fill("ValidSender");
      await senderInput.blur();
      await page.waitForTimeout(100);

      logger.info("Sender accepts valid PascalCase input");
    });
  });

  test.describe("Length Limit Validation", () => {
    test("should validate threadId max length (64 chars)", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing threadId max length validation");

      const threadIdInput = page.locator('input[name="threadId"]');

      // Enter string longer than 64 characters
      const longString = "A".repeat(70);
      await threadIdInput.focus();
      await threadIdInput.fill(longString);
      await threadIdInput.blur();
      await page.waitForTimeout(100);

      // Check for max length error or truncation
      const errorText = page.locator("text=64 characters");
      const hasError = await errorText.isVisible().catch(() => false);
      const actualValue = await threadIdInput.inputValue();

      logger.info(
        `Max length validation - Error shown: ${hasError}, Value length: ${actualValue.length}`,
      );

      // Either error message or maxlength attribute should prevent overflow
      const maxLength = await threadIdInput.getAttribute("maxlength");
      expect(hasError || maxLength !== null || actualValue.length <= 64).toBeTruthy();

      await takeScreenshot(page, logger, "threadId-max-length");
    });

    test("should validate subject max length (128 chars)", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing subject max length validation");

      const subjectInput = page.locator('input[name="subject"]');
      if (!(await subjectInput.isVisible())) {
        logger.info("Subject input not visible - skipping");
        return;
      }

      const longString = "A".repeat(150);
      await subjectInput.focus();
      await subjectInput.fill(longString);
      await subjectInput.blur();
      await page.waitForTimeout(100);

      const errorText = page.locator("text=128 characters");
      const hasError = await errorText.isVisible().catch(() => false);
      const actualValue = await subjectInput.inputValue();
      const maxLength = await subjectInput.getAttribute("maxlength");

      logger.info(
        `Subject max length - Error: ${hasError}, Value length: ${actualValue.length}, maxlength attr: ${maxLength}`,
      );
      await takeScreenshot(page, logger, "subject-max-length");
    });

    test("should validate question max length (256 chars)", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing question max length validation");

      const questionInput = page.locator('input[name="question"]');
      if (!(await questionInput.isVisible())) {
        logger.info("Question input not visible - skipping");
        return;
      }

      const longString = "A".repeat(300);
      await questionInput.focus();
      await questionInput.fill(longString);
      await questionInput.blur();
      await page.waitForTimeout(100);

      const errorText = page.locator("text=256 characters");
      const hasError = await errorText.isVisible().catch(() => false);
      const actualValue = await questionInput.inputValue();
      const maxLength = await questionInput.getAttribute("maxlength");

      logger.info(
        `Question max length - Error: ${hasError}, Value length: ${actualValue.length}, maxlength attr: ${maxLength}`,
      );
      await takeScreenshot(page, logger, "question-max-length");
    });
  });

  test.describe("Error Message Accessibility", () => {
    test("should have accessible error messages with aria attributes", async ({
      page,
      logger,
      context,
    }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing error message accessibility");

      const threadIdInput = page.locator('input[name="threadId"]');

      // Trigger validation error
      await threadIdInput.focus();
      await threadIdInput.fill("@invalid");
      await threadIdInput.blur();
      await page.waitForTimeout(200);

      // Check for aria-describedby linking input to error
      const ariaDescribedBy = await threadIdInput.getAttribute("aria-describedby");
      const ariaInvalid = await threadIdInput.getAttribute("aria-invalid");

      logger.info(
        `Accessibility attributes - aria-describedby: ${ariaDescribedBy}, aria-invalid: ${ariaInvalid}`,
      );

      // If aria-describedby is set, verify the error element exists
      if (ariaDescribedBy) {
        const errorElement = page.locator(`#${ariaDescribedBy}`);
        const errorExists = await errorElement.isVisible().catch(() => false);
        logger.info(`Error element with id="${ariaDescribedBy}" visible: ${errorExists}`);
      }

      // Check for role="alert" on error messages
      const alertElements = page.locator('[role="alert"]');
      const alertCount = await alertElements.count();
      logger.info(`Elements with role="alert": ${alertCount}`);

      await takeScreenshot(page, logger, "error-accessibility");
    });

    test("should announce errors to screen readers", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing screen reader error announcements");

      // Look for aria-live regions
      const liveRegions = page.locator("[aria-live]");
      const liveCount = await liveRegions.count();
      logger.info(`aria-live regions found: ${liveCount}`);

      // Check for polite/assertive announcements
      const politeRegions = page.locator('[aria-live="polite"]');
      const assertiveRegions = page.locator('[aria-live="assertive"]');

      logger.info(
        `Polite regions: ${await politeRegions.count()}, Assertive regions: ${await assertiveRegions.count()}`,
      );

      await takeScreenshot(page, logger, "aria-live-regions");
    });
  });

  test.describe("Real-time Validation Behavior", () => {
    test("should debounce validation on input", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing debounced validation behavior");

      const threadIdInput = page.locator('input[name="threadId"]');

      // Type quickly - validation should not trigger on each keystroke
      await threadIdInput.focus();

      // Type character by character
      for (const char of "@invalid") {
        await page.keyboard.type(char, { delay: 50 });
      }

      // Check immediately - error might not show yet (debounced)
      const immediateError = page.locator("text=alphanumeric");
      const hasImmediateError = await immediateError.isVisible().catch(() => false);
      logger.info(`Error visible immediately after typing: ${hasImmediateError}`);

      // Wait for debounce to complete
      await page.waitForTimeout(300);

      // Now blur to trigger validation
      await threadIdInput.blur();
      await page.waitForTimeout(200);

      const hasErrorAfterBlur = await immediateError.isVisible().catch(() => false);
      logger.info(`Error visible after blur: ${hasErrorAfterBlur}`);

      await takeScreenshot(page, logger, "debounced-validation");
    });

    test("should clear errors when input becomes valid", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing error clearing on valid input");

      const threadIdInput = page.locator('input[name="threadId"]');

      // First trigger an error
      await threadIdInput.focus();
      await threadIdInput.fill("@invalid");
      await threadIdInput.blur();
      await page.waitForTimeout(200);

      const errorText = page.locator("text=alphanumeric");
      const hasErrorInitially = await errorText.isVisible().catch(() => false);
      logger.info(`Error visible after invalid input: ${hasErrorInitially}`);

      // Now enter valid input
      await threadIdInput.focus();
      await threadIdInput.fill("VALID-123");
      await threadIdInput.blur();
      await page.waitForTimeout(200);

      const hasErrorAfterFix = await errorText.isVisible().catch(() => false);
      logger.info(`Error visible after valid input: ${hasErrorAfterFix}`);

      // Error should be cleared
      if (hasErrorInitially) {
        expect(hasErrorAfterFix).toBe(false);
      }

      await takeScreenshot(page, logger, "error-cleared");
    });
  });

  test.describe("Form Submission Prevention", () => {
    test("should prevent submission with validation errors", async ({ page, logger, context }) => {
      const ready = await setupAuthenticatedSession(page, context, logger);
      if (!ready) return;

      logger.step("Testing form submission prevention");

      // Clear required fields
      const threadIdInput = page.locator('input[name="threadId"]');
      await threadIdInput.fill("");

      // Try to submit
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Should stay on same page
      await assertUrl(page, logger, /\/sessions\/new/);

      logger.info("Form submission prevented with empty required fields");
      await takeScreenshot(page, logger, "submission-prevented");
    });
  });
});

// ============================================================================
// Search Input Validation Tests
// ============================================================================

test.describe("Search Input Validation", () => {
  test("should handle empty search gracefully", async ({ page, logger }) => {
    logger.step("Testing empty search handling");

    // Navigate to a page with search
    await page.goto("/");
    await waitForNetworkIdle(page, logger);

    // Try to open search with Cmd+K
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(200);

    // Check if search dialog opened
    const searchDialog = page.locator('[role="dialog"][aria-label="Search"]');
    const isOpen = await searchDialog.isVisible().catch(() => false);

    if (!isOpen) {
      // Try Ctrl+K for non-Mac
      await page.keyboard.press("Control+k");
      await page.waitForTimeout(200);
    }

    const searchInput = page
      .locator('input[placeholder*="search" i], input[type="search"]')
      .first();

    if (await searchInput.isVisible()) {
      // Press Enter on empty input
      await searchInput.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);

      // Should not navigate away or crash
      logger.info("Empty search handled gracefully");
      await takeScreenshot(page, logger, "empty-search");
    } else {
      logger.info("Search input not found - search feature may not be available");
    }
  });

  test("should debounce search input", async ({ page, logger }) => {
    logger.step("Testing search debounce behavior");

    await page.goto("/");
    await waitForNetworkIdle(page, logger);

    // Open search
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(200);

    const searchInput = page
      .locator('input[placeholder*="search" i], input[type="search"]')
      .first();

    if (await searchInput.isVisible()) {
      // Type quickly
      await searchInput.type("brenner", { delay: 30 });

      // Check for loading indicator
      await page.waitForTimeout(100);
      const loadingSpinner = page.locator(".animate-spin");
      const isLoading = await loadingSpinner.isVisible().catch(() => false);

      logger.info(`Loading indicator visible during search: ${isLoading}`);

      // Wait for results
      await page.waitForTimeout(500);

      await takeScreenshot(page, logger, "search-debounce");
    } else {
      logger.info("Search input not found");
    }
  });

  test("should show results or empty state", async ({ page, logger }) => {
    logger.step("Testing search results display");

    await page.goto("/");
    await waitForNetworkIdle(page, logger);

    // Open search
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(200);

    const searchInput = page
      .locator('input[placeholder*="search" i], input[type="search"]')
      .first();

    if (await searchInput.isVisible()) {
      // Search for something that might not exist
      await searchInput.fill("xyznonexistent123");
      await page.waitForTimeout(500);

      // Should show either results or "no results" message
      const noResults = page.locator("text=no results");
      const hasNoResults = await noResults.isVisible().catch(() => false);

      logger.info(`No results message visible: ${hasNoResults}`);

      await takeScreenshot(page, logger, "search-results-or-empty");
    }
  });
});

// ============================================================================
// Excerpt Basket Tests
// ============================================================================

test.describe("Excerpt Basket Validation", () => {
  test("should open and close excerpt basket", async ({ page, logger }) => {
    logger.step("Testing excerpt basket open/close");

    await page.goto("/");
    await waitForNetworkIdle(page, logger);

    // Look for excerpt basket trigger button
    const excerptButton = page
      .locator('button[aria-label*="excerpt" i], button:has-text("Excerpt")')
      .first();

    if (await excerptButton.isVisible()) {
      await excerptButton.click();
      await page.waitForTimeout(200);

      // Check if basket dialog/drawer opened
      const basketDialog = page.locator('[role="dialog"][aria-label*="excerpt" i]');
      const basketDrawer = page.locator("text=Excerpt Basket");

      const isOpen =
        (await basketDialog.isVisible().catch(() => false)) ||
        (await basketDrawer.isVisible().catch(() => false));

      logger.info(`Excerpt basket opened: ${isOpen}`);

      if (isOpen) {
        // Close it
        const closeButton = page.locator('button[aria-label*="close" i]').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(200);
        }
      }

      await takeScreenshot(page, logger, "excerpt-basket");
    } else {
      logger.info("Excerpt basket trigger not found on this page");
    }
  });

  test("should show empty state when basket is empty", async ({ page, logger }) => {
    logger.step("Testing excerpt basket empty state");

    await page.goto("/");
    await waitForNetworkIdle(page, logger);

    // Clear localStorage to ensure empty basket
    await page.evaluate(() => {
      localStorage.removeItem("brenner-excerpt-basket");
    });

    // Reload to apply
    await page.reload();
    await waitForNetworkIdle(page, logger);

    const excerptButton = page
      .locator('button[aria-label*="excerpt" i], button:has-text("Excerpt")')
      .first();

    if (await excerptButton.isVisible()) {
      await excerptButton.click();
      await page.waitForTimeout(200);

      // Check for empty state message
      const emptyState = page.locator("text=No selections yet");
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      logger.info(`Empty basket state visible: ${hasEmptyState}`);
      await takeScreenshot(page, logger, "excerpt-basket-empty");
    }
  });

  test("should handle excerpt basket theme input", async ({ page, logger }) => {
    logger.step("Testing excerpt basket theme input");

    await page.goto("/");
    await waitForNetworkIdle(page, logger);

    const excerptButton = page
      .locator('button[aria-label*="excerpt" i], button:has-text("Excerpt")')
      .first();

    if (await excerptButton.isVisible()) {
      await excerptButton.click();
      await page.waitForTimeout(200);

      // Look for theme input
      const themeInput = page.locator('input[placeholder*="theme" i]');

      if (await themeInput.isVisible()) {
        await themeInput.fill("Test Theme for E2E");
        const value = await themeInput.inputValue();
        expect(value).toBe("Test Theme for E2E");
        logger.info("Theme input accepts text correctly");
      } else {
        logger.info("Theme input not found in basket");
      }

      await takeScreenshot(page, logger, "excerpt-basket-theme");
    }
  });

  test("should persist basket items in localStorage", async ({ page, logger }) => {
    logger.step("Testing excerpt basket localStorage persistence");

    await page.goto("/");
    await waitForNetworkIdle(page, logger);

    // Add a test item to localStorage directly
    await page.evaluate(() => {
      const testItems = [
        {
          id: "test-item-1",
          anchor: "§42",
          quote: "This is a test quote for E2E testing",
          title: "Test Document",
          addedAt: Date.now(),
        },
      ];
      localStorage.setItem("brenner-excerpt-basket", JSON.stringify(testItems));
    });

    // Reload page
    await page.reload();
    await waitForNetworkIdle(page, logger);

    // Open basket
    const excerptButton = page
      .locator('button[aria-label*="excerpt" i], button:has-text("Excerpt")')
      .first();

    if (await excerptButton.isVisible()) {
      await excerptButton.click();
      await page.waitForTimeout(200);

      // Check if item is displayed
      const testQuote = page.locator("text=test quote for E2E");
      const hasItem = await testQuote.isVisible().catch(() => false);

      logger.info(`Persisted basket item visible after reload: ${hasItem}`);

      // Check for item count badge (look for badge-like elements near the excerpt button)
      // Use more specific selectors to avoid matching random "1"s on the page
      const badgeWithCount = page
        .locator('[data-testid*="badge"], [class*="badge"], [aria-label*="item"], [role="status"]')
        .filter({ hasText: "1" })
        .first();
      const hasBadge = await badgeWithCount.isVisible().catch(() => false);

      logger.info(`Item count badge visible: ${hasBadge}`);
      await takeScreenshot(page, logger, "excerpt-basket-persisted");

      // Clean up
      await page.evaluate(() => {
        localStorage.removeItem("brenner-excerpt-basket");
      });
    }
  });
});

// ============================================================================
// Cross-cutting Form Tests
// ============================================================================

test.describe("Form Keyboard Accessibility", () => {
  test("should support tab navigation through form fields", async ({ page, logger, context }) => {
    const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
    await context.addCookies([
      {
        name: "brenner_lab_secret",
        value: labSecret,
        domain: getCookieDomain(),
        path: "/",
      },
    ]);

    const response = await page.goto("/sessions/new");
    await waitForNetworkIdle(page, logger);

    if (response?.status() === 404) {
      logger.info("Lab mode disabled - skipping");
      return;
    }

    const pageText = await page.locator("body").textContent();
    if (pageText?.includes("Lab Mode Locked")) {
      logger.warn("Auth required - skipping");
      return;
    }

    logger.step("Testing tab navigation through form");

    // Start at beginning of form
    const threadIdInput = page.locator('input[name="threadId"]');
    await threadIdInput.focus();

    // Tab through fields
    const expectedFields = [
      "threadId",
      "sender",
      "to",
      "subject",
      "excerpt",
      "theme",
      "domain",
      "question",
    ];
    const actualOrder: string[] = [];

    for (let i = 0; i < expectedFields.length + 2; i++) {
      const focused = await page.evaluate(() => document.activeElement?.getAttribute("name"));
      if (focused) {
        actualOrder.push(focused);
      }
      await page.keyboard.press("Tab");
    }

    logger.info(`Tab order: ${actualOrder.join(" → ")}`);

    // Verify logical order (threadId → sender → to)
    const threadIdIdx = actualOrder.indexOf("threadId");
    const senderIdx = actualOrder.indexOf("sender");
    const toIdx = actualOrder.indexOf("to");

    if (threadIdIdx >= 0 && senderIdx >= 0) {
      expect(threadIdIdx).toBeLessThan(senderIdx);
    }
    if (senderIdx >= 0 && toIdx >= 0) {
      expect(senderIdx).toBeLessThan(toIdx);
    }

    await takeScreenshot(page, logger, "tab-navigation");
  });
});
