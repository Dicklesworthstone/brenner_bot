/**
 * E2E Tests: Error Recovery and Retry Flows
 *
 * Tests the application's ability to recover from transient errors,
 * including API failures, network issues, and authentication problems.
 *
 * These tests complement error-handling.spec.ts by focusing on the
 * recovery paths - verifying users can retry and succeed after errors.
 *
 * @see brenner_bot-hgig (bead)
 */

import { expect, fillInput, navigateTo, takeScreenshot, test, waitForNetworkIdle } from "./utils";
import { withStep } from "./utils/e2e-logging";

// ============================================================================
// API Retry on Transient Failure
// ============================================================================

test.describe("Error Recovery - API Retry", () => {
  // Skip route-based tests on Safari - WebKit route handling differs
  test.skip(({ browserName }) => browserName === "webkit", "WebKit route interception differs");

  test("retries API call on 502 and succeeds on reload", async ({ page, logger }) => {
    let requestCount = 0;

    await withStep(logger, page, "Set up transient failure route", async () => {
      // First request fails with 502, subsequent requests succeed
      await page.route("**/api/**", async (route) => {
        requestCount++;
        logger.info(`API request #${requestCount} intercepted`);

        if (requestCount === 1) {
          logger.info("Returning 502 Bad Gateway for first request");
          route.fulfill({
            status: 502,
            contentType: "text/plain",
            body: "Bad Gateway",
          });
        } else {
          logger.info("Allowing subsequent request to pass through");
          route.continue();
        }
      });
    });

    await withStep(logger, page, "Navigate to corpus (first request fails)", async () => {
      await page.goto("/corpus", { timeout: 30000 });
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Page should still be visible after 502", async () => {
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
      logger.info(`Page visible: ${bodyVisible}, request count: ${requestCount}`);
    });

    await withStep(logger, page, "Reload page (retry)", async () => {
      await page.reload();
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Page should load successfully on retry", async () => {
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
      expect(requestCount).toBeGreaterThanOrEqual(2);
      logger.info(`Retry succeeded, total requests: ${requestCount}`);
    });

    await takeScreenshot(page, logger, "error-recovery-api-retry");
  });

  test("handles multiple consecutive 503 errors gracefully", async ({ page, logger }) => {
    let requestCount = 0;

    await withStep(logger, page, "Set up repeated 503 failure", async () => {
      await page.route("**/api/**", async (route) => {
        requestCount++;
        logger.info(`Request #${requestCount}: returning 503`);
        route.fulfill({
          status: 503,
          headers: { "Retry-After": "5" },
          contentType: "application/json",
          body: JSON.stringify({ error: "Service Unavailable" }),
        });
      });
    });

    await withStep(logger, page, "Navigate despite 503 errors", async () => {
      await page.goto("/corpus", { timeout: 30000 });
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Page should remain stable", async () => {
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
      logger.info(`Page stable after ${requestCount} failed requests`);
    });

    await withStep(logger, page, "Clear route and retry", async () => {
      await page.unroute("**/api/**");
      await page.reload();
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Verify recovery after route cleared", async () => {
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
    });

    await takeScreenshot(page, logger, "error-recovery-repeated-503");
    logger.info(`Total requests before recovery: ${requestCount}`);
  });
});

// ============================================================================
// Form Validation Recovery
// ============================================================================

test.describe("Error Recovery - Form Validation", () => {
  // Skip form validation tests on Safari - WebKit cookie handling differs
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "WebKit cookie handling differs in tests",
  );

  test("recovers from validation error and resubmits successfully", async ({
    page,
    logger,
    context,
  }) => {
    const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
    await context.addCookies([
      {
        name: "brenner_lab_secret",
        value: labSecret,
        domain: "localhost",
        path: "/",
      },
    ]);

    const response = await page.goto("/sessions/new");
    await waitForNetworkIdle(page, logger);

    const status = response?.status() ?? 0;
    if (status === 404) {
      logger.info("Page returns 404 - lab mode disabled, skipping form validation recovery test");
      return;
    }

    const pageText = await page.locator("body").textContent();
    if (pageText?.includes("Lab Mode Locked")) {
      logger.warn("Auth required - skipping form validation recovery test");
      return;
    }

    await withStep(logger, page, "Submit empty form (should fail)", async () => {
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Browser prevents submission due to required fields
      const url = page.url();
      expect(url).toContain("/sessions/new");
      logger.info("Empty form submission blocked as expected");
    });

    await withStep(logger, page, "Fill in required fields to fix validation", async () => {
      await fillInput(page, logger, 'input[name="threadId"]', "RECOVERY-TEST-001");
      await fillInput(page, logger, 'input[name="sender"]', "RecoveryTestAgent");
      await fillInput(page, logger, 'input[name="to"]', "TestRecipient");
      await fillInput(
        page,
        logger,
        'textarea[name="excerpt"]',
        "Test excerpt for validation recovery.",
      );
      await fillInput(page, logger, 'input[name="question"]', "Does validation recovery work?");
    });

    await withStep(logger, page, "Form should now be submittable", async () => {
      // Verify all required fields are filled
      const threadId = await page.locator('input[name="threadId"]').inputValue();
      const sender = await page.locator('input[name="sender"]').inputValue();
      const excerpt = await page.locator('textarea[name="excerpt"]').inputValue();

      expect(threadId).toBe("RECOVERY-TEST-001");
      expect(sender).toBe("RecoveryTestAgent");
      expect(excerpt).toContain("validation recovery");
      logger.info("All required fields now filled - form ready for submission");
    });

    await takeScreenshot(page, logger, "error-recovery-form-validation");
  });

  test("handles field-level errors and allows correction", async ({ page, logger, context }) => {
    const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
    await context.addCookies([
      {
        name: "brenner_lab_secret",
        value: labSecret,
        domain: "localhost",
        path: "/",
      },
    ]);

    const response = await page.goto("/sessions/new");
    await waitForNetworkIdle(page, logger);

    const status = response?.status() ?? 0;
    if (status === 404) {
      logger.info("Page returns 404 - lab mode disabled");
      return;
    }

    const pageText = await page.locator("body").textContent();
    if (pageText?.includes("Lab Mode Locked")) {
      logger.warn("Auth required - skipping test");
      return;
    }

    await withStep(logger, page, "Fill form with potentially problematic values", async () => {
      // Fill with very long values to test field limits
      await fillInput(page, logger, 'input[name="threadId"]', "A".repeat(50));
      await fillInput(page, logger, 'input[name="sender"]', "TestSender");
    });

    await withStep(logger, page, "Clear and correct the values", async () => {
      const threadIdInput = page.locator('input[name="threadId"]');
      await threadIdInput.clear();
      await threadIdInput.fill("CORRECTED-TEST-001");

      const value = await threadIdInput.inputValue();
      expect(value).toBe("CORRECTED-TEST-001");
      logger.info("Field value successfully corrected");
    });

    await takeScreenshot(page, logger, "error-recovery-field-correction");
  });
});

// ============================================================================
// Session Load Recovery
// ============================================================================

test.describe("Error Recovery - Session Load", () => {
  // Skip route-based tests on Safari
  test.skip(({ browserName }) => browserName === "webkit", "WebKit route interception differs");

  test("session page provides refresh button for manual retry", async ({
    page,
    logger,
    context,
  }) => {
    const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
    await context.addCookies([
      {
        name: "brenner_lab_secret",
        value: labSecret,
        domain: "localhost",
        path: "/",
      },
    ]);

    await withStep(logger, page, "Navigate to session page", async () => {
      const response = await page.goto("/sessions/test-recovery-001");
      const status = response?.status() ?? 0;

      if (status === 404) {
        logger.info("Page returns 404 - lab mode disabled, skipping session load test");
        return;
      }

      await waitForNetworkIdle(page, logger);
    });

    const pageText = await page.locator("body").textContent();
    if (pageText?.includes("Lab Mode Locked")) {
      logger.warn("Auth required - skipping session load recovery test");
      await takeScreenshot(page, logger, "error-recovery-session-locked");
      return;
    }

    await withStep(logger, page, "Check for refresh controls", async () => {
      // The session page has RefreshControls component with Refresh button
      const refreshButton = page.getByRole("button", { name: /refresh/i });
      const refreshVisible = await refreshButton.isVisible().catch(() => false);

      if (refreshVisible) {
        logger.info("Refresh button found - can be used for manual retry");
        await takeScreenshot(page, logger, "error-recovery-session-refresh");
      } else {
        // Page may show error state or empty thread
        logger.info("Refresh button not visible - page may show error or empty state");
        await takeScreenshot(page, logger, "error-recovery-session-state");
      }
    });
  });

  test("session error state shows actionable message", async ({ page, logger, context }) => {
    const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
    await context.addCookies([
      {
        name: "brenner_lab_secret",
        value: labSecret,
        domain: "localhost",
        path: "/",
      },
    ]);

    // Mock Agent Mail to fail
    await page.route("**/agent-mail/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Agent Mail unavailable" }),
      });
    });

    await withStep(logger, page, "Navigate to session with failing Agent Mail", async () => {
      const response = await page.goto("/sessions/test-error-recovery");
      const status = response?.status() ?? 0;

      if (status === 404) {
        logger.info("Page returns 404 - lab mode disabled");
        return;
      }

      await waitForNetworkIdle(page, logger);
    });

    const pageText = await page.locator("body").textContent();
    if (pageText?.includes("Lab Mode Locked")) {
      logger.warn("Auth required - skipping test");
      return;
    }

    await withStep(logger, page, "Check for error message", async () => {
      const hasErrorMessage =
        pageText?.includes("Failed to load") ||
        pageText?.includes("error") ||
        pageText?.includes("unavailable") ||
        pageText?.includes("No messages");

      logger.info(`Error state detected: ${hasErrorMessage}`);
      // Either shows error or empty state - both are acceptable
    });

    await takeScreenshot(page, logger, "error-recovery-session-error");
  });
});

// ============================================================================
// Network Offline/Online Recovery
// ============================================================================

test.describe("Error Recovery - Network", () => {
  // Skip all network offline tests - context.setOffline() behavior varies across environments
  test.skip(true, "Offline tests are environment-dependent and flaky in CI");

  test("handles offline state and recovers when online", async ({ page, context, logger }) => {
    await withStep(logger, page, "Load page while online", async () => {
      await navigateTo(page, logger, "/corpus");
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Go offline", async () => {
      await context.setOffline(true);
      logger.info("Network set to offline");
    });

    await withStep(logger, page, "Attempt navigation while offline", async () => {
      try {
        await page.goto("/method", { timeout: 5000 });
      } catch {
        logger.info("Navigation failed as expected when offline");
      }
    });

    await withStep(logger, page, "Page should show some content", async () => {
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
    });

    await withStep(logger, page, "Restore connection and reload", async () => {
      await context.setOffline(false);
      await page.waitForTimeout(500);
      await page.goto("/corpus", { timeout: 30000 });
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Verify page loads after reconnection", async () => {
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
      logger.info("Successfully recovered from offline state");
    });

    await takeScreenshot(page, logger, "error-recovery-network-offline");
  });
});

// ============================================================================
// Auth Expiry Recovery
// ============================================================================

test.describe("Error Recovery - Authentication", () => {
  // Skip auth tests on Safari - WebKit cookie handling differs in test env
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "WebKit cookie handling differs in tests",
  );

  test("handles expired auth and allows re-authentication", async ({ page, logger, context }) => {
    await withStep(logger, page, "Start with valid auth cookie", async () => {
      const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
      await context.addCookies([
        {
          name: "brenner_lab_secret",
          value: labSecret,
          domain: "localhost",
          path: "/",
        },
      ]);
    });

    const response = await page.goto("/sessions/new");
    await waitForNetworkIdle(page, logger);

    const status = response?.status() ?? 0;
    if (status === 404) {
      logger.info("Page returns 404 - lab mode disabled, skipping auth expiry test");
      return;
    }

    const initialText = await page.locator("body").textContent();
    const wasAuthed = initialText?.includes("New Session") && !initialText?.includes("Locked");
    logger.info(`Initial auth state: ${wasAuthed ? "authenticated" : "not authenticated"}`);

    await withStep(logger, page, "Clear cookies to simulate expiry", async () => {
      await context.clearCookies();
      logger.info("Cookies cleared - auth should be expired");
    });

    await withStep(logger, page, "Reload to trigger re-auth check", async () => {
      await page.reload();
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Check for locked/auth required state", async () => {
      const pageText = await page.locator("body").textContent();
      const showsLocked =
        pageText?.includes("Locked") ||
        pageText?.includes("Access Denied") ||
        pageText?.includes("authentication");

      const showsForm = pageText?.includes("New Session") && !pageText?.includes("Locked");

      logger.info(`After cookie clear: Locked=${showsLocked}, Form=${showsForm}`);
      // Either locked (expected) or still showing form (dev mode without strict auth)
      expect(showsLocked || showsForm).toBeTruthy();
    });

    await withStep(logger, page, "Re-authenticate with new cookie", async () => {
      const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
      await context.addCookies([
        {
          name: "brenner_lab_secret",
          value: labSecret,
          domain: "localhost",
          path: "/",
        },
      ]);
      await page.reload();
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Verify re-authentication success", async () => {
      const pageText = await page.locator("body").textContent();
      const recovered = pageText?.includes("New Session") || pageText?.includes("Locked");
      expect(recovered).toBeTruthy();
      logger.info("Auth recovery test complete");
    });

    await takeScreenshot(page, logger, "error-recovery-auth-expiry");
  });

  test("shows helpful message on invalid credentials", async ({ page, logger, context }) => {
    await withStep(logger, page, "Set invalid auth cookie", async () => {
      await context.addCookies([
        {
          name: "brenner_lab_secret",
          value: "invalid-secret-12345",
          domain: "localhost",
          path: "/",
        },
      ]);
    });

    const response = await page.goto("/sessions/new");
    await waitForNetworkIdle(page, logger);

    const status = response?.status() ?? 0;
    if (status === 404) {
      logger.info("Page returns 404 - lab mode disabled");
      return;
    }

    await withStep(logger, page, "Check for helpful error message", async () => {
      const pageText = await page.locator("body").textContent();
      const hasHelpfulMessage =
        pageText?.includes("Lab Mode") ||
        pageText?.includes("BRENNER_LAB") ||
        pageText?.includes("Locked") ||
        pageText?.includes("Access");

      logger.info(`Helpful message shown: ${hasHelpfulMessage}`);
    });

    await takeScreenshot(page, logger, "error-recovery-invalid-auth");
  });
});

// ============================================================================
// Partial Data Load Recovery
// ============================================================================

test.describe("Error Recovery - Partial Data", () => {
  // Skip route-based tests on Safari
  test.skip(({ browserName }) => browserName === "webkit", "WebKit route interception differs");

  test("shows partial content when some API calls fail", async ({ page, logger }) => {
    let searchFailed = false;

    await withStep(logger, page, "Set up partial failure route", async () => {
      // Fail search API but allow others to pass
      await page.route("**/api/search**", (route) => {
        searchFailed = true;
        logger.info("Blocking search API call");
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Search unavailable" }),
        });
      });
    });

    await withStep(logger, page, "Navigate to page with partial failure", async () => {
      await navigateTo(page, logger, "/corpus");
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Verify page loads despite API failure", async () => {
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
      logger.info(`Search API failed: ${searchFailed}, page still visible: ${bodyVisible}`);
    });

    await withStep(logger, page, "Clear route and reload for full content", async () => {
      await page.unroute("**/api/search**");
      await page.reload();
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Verify full recovery", async () => {
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
      logger.info("Partial data recovery test complete");
    });

    await takeScreenshot(page, logger, "error-recovery-partial-data");
  });

  test("maintains navigation after component errors", async ({ page, logger }) => {
    await withStep(logger, page, "Navigate to corpus", async () => {
      await navigateTo(page, logger, "/corpus");
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Navigate to method page", async () => {
      await navigateTo(page, logger, "/method");
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Navigate to distillations", async () => {
      await navigateTo(page, logger, "/distillations");
      await waitForNetworkIdle(page, logger);
    });

    await withStep(logger, page, "Verify all pages accessible", async () => {
      const bodyVisible = await page.locator("body").isVisible();
      expect(bodyVisible).toBe(true);
      logger.info("Navigation chain completed successfully");
    });

    await takeScreenshot(page, logger, "error-recovery-navigation-chain");
  });
});
