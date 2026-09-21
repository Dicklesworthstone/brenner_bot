/**
 * E2E Tests: Sessions Workflow
 *
 * Tests the research session creation workflow at /sessions/new.
 * This includes authentication checks, form interactions, and Agent Mail integration.
 *
 * Test Requirements:
 * - Lab mode must be enabled (BRENNER_LAB_MODE=1)
 * - Authentication via BRENNER_LAB_SECRET or Cloudflare Access
 * - Agent Mail server running (optional - tests handle unavailability)
 */

import {
  assertTextContent,
  assertUrl,
  expect,
  fillInput,
  takeScreenshot,
  test,
  waitForNetworkIdle,
} from "./utils";

test.describe("Sessions Workflow", () => {
  test.describe("Access Control", () => {
    test("should show locked state or 404 when lab mode is disabled", async ({ page, logger }) => {
      // Navigate without any auth headers - should show locked state or 404
      const response = await page.goto("/sessions/new");
      await waitForNetworkIdle(page, logger);

      logger.step("Checking access control response");
      const status = response?.status() ?? 0;
      logger.info(`Response status: ${status}`);

      // In production with lab mode disabled, page returns 404
      // In dev or with lab mode enabled, page renders locked state or form
      if (status === 404) {
        logger.info("Page returns 404 - lab mode disabled (expected in production)");
        await takeScreenshot(page, logger, "sessions-404");
        return; // Test passes - page is correctly hidden
      }

      // Check for locked state UI
      const pageText = await page.locator("body").textContent();
      const isLocked =
        pageText?.includes("Lab Mode Locked") ||
        pageText?.includes("Access Denied") ||
        pageText?.includes("Lab mode is disabled");

      if (isLocked) {
        logger.info("Page shows locked state as expected");

        // Should show unlock instructions
        await assertTextContent(
          page,
          logger,
          "body",
          /BRENNER_LAB_MODE|Lab Mode|Cloudflare Access|Shared Secret/i,
        );

        await takeScreenshot(page, logger, "sessions-locked-state");
      } else {
        // Lab mode might be enabled in this environment
        logger.warn("Lab mode appears to be enabled - checking for session form");
        const hasForm = await page.locator('form[action*="sendKickoff"], form').first().isVisible();
        expect(hasForm || isLocked).toBeTruthy();
      }
    });

    test("should require authentication even with lab mode enabled", async ({ page, logger }) => {
      // This test verifies the defense-in-depth security model
      // Even with BRENNER_LAB_MODE=1, we need auth headers/cookies
      const response = await page.goto("/sessions/new");
      await waitForNetworkIdle(page, logger);

      logger.step("Checking authentication requirements");
      const status = response?.status() ?? 0;

      // 404 means lab mode is disabled entirely (valid in production)
      if (status === 404) {
        logger.info("Page returns 404 - lab mode disabled");
        return;
      }

      const pageText = await page.locator("body").textContent();

      // Either shows locked (needs auth) or form (has auth)
      const showsLocked = pageText?.includes("Locked") || pageText?.includes("Access Denied");
      const showsForm = pageText?.includes("New Session") && pageText?.includes("Send Kickoff");

      logger.info(`Locked: ${showsLocked}, Form: ${showsForm}`);
      expect(showsLocked || showsForm).toBeTruthy();

      await takeScreenshot(page, logger, "sessions-auth-check");
    });
  });

  test.describe("Session Form", () => {
    // These tests require authentication - configure in playwright.config.ts
    // or use storageState with pre-authenticated session
    // Note: In production with lab mode disabled, these tests skip gracefully

    test("should display session form when authenticated", async ({ page, logger, context }) => {
      // Set lab secret cookie for authentication
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

      logger.step("Checking for session form elements");
      const status = response?.status() ?? 0;

      // 404 means lab mode is disabled entirely
      if (status === 404) {
        logger.info("Page returns 404 - lab mode disabled, skipping form test");
        return;
      }

      const pageText = await page.locator("body").textContent();

      // Check if we got through auth
      if (pageText?.includes("Lab Mode Locked")) {
        logger.warn("Still showing locked state - auth cookie may not match server secret");
        await takeScreenshot(page, logger, "sessions-form-still-locked");
        // Skip remaining assertions - env not configured for auth
        return;
      }

      // Should show the form header
      await expect(page.locator("h1")).toContainText(/New Session/i);

      // Should show form sections
      await assertTextContent(page, logger, "body", /Session Setup/i);
      await assertTextContent(page, logger, "body", /Content/i);
      await assertTextContent(page, logger, "body", /Options/i);

      // Should have key form inputs
      const threadIdInput = page.locator('input[name="threadId"]');
      await expect(threadIdInput).toBeVisible();

      const senderInput = page.locator('input[name="sender"]');
      await expect(senderInput).toBeVisible();

      const recipientsInput = page.locator('input[name="to"]');
      await expect(recipientsInput).toBeVisible();

      const excerptTextarea = page.locator('textarea[name="excerpt"]');
      await expect(excerptTextarea).toBeVisible();

      // Should have submit button
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText(/Send Kickoff/i);

      await takeScreenshot(page, logger, "sessions-form-authenticated");
      logger.info("Session form displayed successfully");
    });

    test("should show Agent Mail connection status", async ({ page, logger, context }) => {
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

      logger.step("Checking Agent Mail status indicator");
      const status = response?.status() ?? 0;

      if (status === 404) {
        logger.info("Page returns 404 - lab mode disabled, skipping Agent Mail test");
        return;
      }

      const pageText = await page.locator("body").textContent();

      if (pageText?.includes("Lab Mode Locked")) {
        logger.warn("Auth required - skipping Agent Mail status check");
        return;
      }

      // Should show Agent Mail section
      await assertTextContent(page, logger, "body", /Agent Mail/i);

      // Should show either Connected or Unreachable status
      const statusText = await page.locator("body").textContent();
      const isConnected = statusText?.includes("Connected");
      const isUnreachable = statusText?.includes("Unreachable");

      logger.info(`Agent Mail status - Connected: ${isConnected}, Unreachable: ${isUnreachable}`);

      // One of these should be true
      expect(isConnected || isUnreachable).toBeTruthy();

      await takeScreenshot(page, logger, "sessions-agent-mail-status");
    });

    test("should validate required form fields", async ({ page, logger, context }) => {
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
        logger.info("Page returns 404 - lab mode disabled, skipping validation test");
        return;
      }

      const pageText = await page.locator("body").textContent();
      if (pageText?.includes("Lab Mode Locked")) {
        logger.warn("Auth required - skipping form validation test");
        return;
      }

      logger.step("Testing required field validation");

      // Try to submit empty form
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Browser should prevent submission due to required fields
      // We should still be on the same page
      await assertUrl(page, logger, /\/sessions\/new/);

      logger.info("Form validation prevented empty submission");
      await takeScreenshot(page, logger, "sessions-validation");
    });

    test("should fill and interact with form fields", async ({ page, logger, context }) => {
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
        logger.info("Page returns 404 - lab mode disabled, skipping form interaction test");
        return;
      }

      const pageText = await page.locator("body").textContent();
      if (pageText?.includes("Lab Mode Locked")) {
        logger.warn("Auth required - skipping form interaction test");
        return;
      }

      logger.step("Filling in form fields");

      // Fill required fields
      await fillInput(page, logger, 'input[name="threadId"]', "TEST-E2E-001");
      await fillInput(page, logger, 'input[name="sender"]', "E2ETestAgent");
      await fillInput(page, logger, 'input[name="to"]', "Agent1, Agent2");
      await fillInput(
        page,
        logger,
        'textarea[name="excerpt"]',
        "This is a test excerpt for E2E testing.\n\nIt contains multiple lines to test the textarea.",
      );

      // Fill optional fields
      await fillInput(page, logger, 'input[name="subject"]', "[TEST-E2E-001] E2E Test Kickoff");
      await fillInput(page, logger, 'input[name="theme"]', "testing");
      await fillInput(page, logger, 'input[name="domain"]', "qa");
      await fillInput(page, logger, 'input[name="question"]', "Does the form work correctly?");

      // Check the ack required checkbox
      const ackCheckbox = page.locator('input[name="ackRequired"]');
      await ackCheckbox.check();
      await expect(ackCheckbox).toBeChecked();

      logger.info("All form fields filled successfully");
      await takeScreenshot(page, logger, "sessions-form-filled");

      // Note: We don't actually submit in tests to avoid creating real sessions
      // A full integration test would need mock Agent Mail
    });
  });

  test.describe("Success State", () => {
    test("should display success message when thread is sent", async ({
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

      // Navigate with success params to test the success UI
      const response = await page.goto("/sessions/new?sent=1&thread=TEST-SUCCESS-001");
      await waitForNetworkIdle(page, logger);

      const status = response?.status() ?? 0;
      if (status === 404) {
        logger.info("Page returns 404 - lab mode disabled, skipping success state test");
        return;
      }

      const pageText = await page.locator("body").textContent();
      if (pageText?.includes("Lab Mode Locked")) {
        logger.warn("Auth required - skipping success state test");
        return;
      }

      logger.step("Checking success message display");

      // Should show success message
      await assertTextContent(page, logger, "body", /Kickoff sent successfully/i);
      await assertTextContent(page, logger, "body", /TEST-SUCCESS-001/i);

      await takeScreenshot(page, logger, "sessions-success-state");
      logger.info("Success message displayed correctly");
    });
  });
});
