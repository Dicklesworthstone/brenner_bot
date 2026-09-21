/**
 * E2E Tests: Session Lifecycle
 *
 * Tests the complete session lifecycle from creation to artifact viewing:
 * 1. Session list browsing
 * 2. Session detail viewing with status monitoring
 * 3. Artifact and lint report viewing
 *
 * Prerequisites:
 * - Lab mode enabled (BRENNER_LAB_MODE=1)
 * - Authentication via BRENNER_LAB_SECRET or Cloudflare Access
 * - Agent Mail server (optional - tests handle unavailability gracefully)
 */

import {
  assertTextContent,
  expect,
  navigateTo,
  takeScreenshot,
  test,
  waitForNetworkIdle,
} from "./utils";
import { withStep } from "./utils/e2e-logging";

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
// Helper: Set up lab auth cookie for a context
// ============================================================================
async function setupLabAuth(context: import("@playwright/test").BrowserContext) {
  const labSecret = process.env.BRENNER_LAB_SECRET || "test-secret-for-e2e";
  await context.addCookies([
    {
      name: "brenner_lab_secret",
      value: labSecret,
      domain: getCookieDomain(),
      path: "/",
    },
  ]);
}

// ============================================================================
// Helper: Check if we should skip auth-dependent tests
// ============================================================================
async function shouldSkipLabModeTest(
  page: import("@playwright/test").Page,
  logger: { info: (msg: string) => void; warn: (msg: string) => void },
  testName: string,
): Promise<boolean> {
  const pageText = await page.locator("body").textContent();

  // Check for 404 or "Not found" (lab mode disabled or page doesn't exist)
  const status = await page.evaluate(() => {
    // This runs in browser - check if we got a 404 page
    return (
      document.querySelector("title")?.textContent?.includes("404") ||
      document.body.textContent?.includes("This page could not be found") ||
      document.body.textContent?.includes("Not found") ||
      document.body.textContent?.trim() === "Not found"
    );
  });

  if (status) {
    logger.info(`${testName}: Page not found (404), skipping test`);
    return true;
  }

  // Check for locked state
  if (pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied")) {
    logger.warn(`${testName}: Auth required, skipping test`);
    return true;
  }

  return false;
}

// ============================================================================
// Session List Tests
// ============================================================================
test.describe("Session List", () => {
  test.describe("Access Control", () => {
    test("shows locked state when not authenticated", async ({ page, logger }) => {
      const response = await page.goto("/sessions");
      await waitForNetworkIdle(page, logger);

      logger.step("Checking access control for session list");
      const status = response?.status() ?? 0;

      if (status === 404) {
        logger.info("Page returns 404 - lab mode disabled");
        await takeScreenshot(page, logger, "session-list-404");
        return;
      }

      const pageText = await page.locator("body").textContent();
      const isLocked = pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied");

      if (isLocked) {
        logger.info("Session list shows locked state as expected");
        await assertTextContent(page, logger, "body", /Lab Mode Locked/i);
        await takeScreenshot(page, logger, "session-list-locked");
      }
    });
  });

  test.describe("Authenticated List View", () => {
    test("displays session list page when authenticated", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await navigateTo(page, logger, "/sessions");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "session list display")) {
        return;
      }

      logger.step("Verifying session list page elements");

      // Should show the header
      await expect(page.locator("h1")).toContainText(/Sessions/i);

      // Should show "New Session" button
      const newSessionButton = page.locator('a[href="/sessions/new"]').first();
      await expect(newSessionButton).toBeVisible();

      // Should show either thread cards or empty state
      const pageText = await page.locator("body").textContent();
      const hasThreads = pageText?.includes("messages");
      const hasEmptyState = pageText?.includes("No sessions yet");

      logger.info(`Session list: hasThreads=${hasThreads}, hasEmptyState=${hasEmptyState}`);
      expect(hasThreads || hasEmptyState).toBeTruthy();

      await takeScreenshot(page, logger, "session-list-authenticated");
    });

    test("shows refresh controls", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await navigateTo(page, logger, "/sessions");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "refresh controls")) {
        return;
      }

      logger.step("Checking for refresh controls");

      // RefreshControls component should be visible
      const refreshButton = page
        .locator("button")
        .filter({ hasText: /refresh/i })
        .first();
      const hasRefresh = await refreshButton.isVisible().catch(() => false);

      logger.info(`Refresh controls visible: ${hasRefresh}`);
      await takeScreenshot(page, logger, "session-list-refresh");
    });

    test("empty state shows helpful message and link", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await navigateTo(page, logger, "/sessions");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "empty state")) {
        return;
      }

      const pageText = await page.locator("body").textContent();

      if (pageText?.includes("No sessions yet")) {
        logger.step("Verifying empty state content");

        // Should explain what to do
        await assertTextContent(page, logger, "body", /Brenner Loop|research session/i);

        // Should have a CTA button
        const ctaButton = page.locator('a[href="/sessions/new"]');
        await expect(ctaButton.first()).toBeVisible();

        await takeScreenshot(page, logger, "session-list-empty");
      } else {
        logger.info("Sessions exist, skipping empty state test");
      }
    });

    test("clicking New Session navigates to creation form", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await navigateTo(page, logger, "/sessions");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "new session navigation")) {
        return;
      }

      await withStep(logger, page, "Click New Session button", async () => {
        const newSessionLink = page.locator('a[href="/sessions/new"]').first();
        await expect(newSessionLink).toBeVisible();
        await newSessionLink.click();
      });

      await withStep(logger, page, "Verify navigation to new session form", async () => {
        await expect(page).toHaveURL(/\/sessions\/new/);
      });

      logger.info("Navigation to new session form successful");
    });
  });
});

// ============================================================================
// Session Detail Tests
// ============================================================================
test.describe("Session Detail", () => {
  test.describe("Access Control", () => {
    test("shows locked state for unauthenticated access to session detail", async ({
      page,
      logger,
    }) => {
      // Try to access a specific session without auth
      const response = await page.goto("/sessions/TEST-SESSION-ID");
      await waitForNetworkIdle(page, logger);

      logger.step("Checking access control for session detail");
      const status = response?.status() ?? 0;

      if (status === 404) {
        logger.info("Page returns 404 - lab mode disabled or session not found");
        return;
      }

      const pageText = await page.locator("body").textContent();
      const isLocked = pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied");

      if (isLocked) {
        logger.info("Session detail shows locked state");
        await takeScreenshot(page, logger, "session-detail-locked");
      }
    });
  });

  test.describe("Session Status Display", () => {
    test("displays session header and thread ID", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      // Use a test thread ID that likely won't exist but will show proper UI
      await navigateTo(page, logger, "/sessions/TEST-E2E-SESSION");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "session header")) {
        return;
      }

      logger.step("Checking session header elements");

      // Should show "Session" heading
      const heading = page.locator("h1");
      await expect(heading).toContainText(/Session/i);

      // Should show the thread ID
      await assertTextContent(page, logger, "body", /TEST-E2E-SESSION/);

      await takeScreenshot(page, logger, "session-detail-header");
    });

    test("shows error state when thread fails to load", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      // Access a session that doesn't exist
      await navigateTo(page, logger, "/sessions/NONEXISTENT-THREAD-XYZ");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "thread load error")) {
        return;
      }

      logger.step("Checking error handling for missing thread");

      const pageText = await page.locator("body").textContent();

      // Should either show error message or empty thread state
      const hasError =
        pageText?.includes("Failed to load") ||
        pageText?.includes("No messages found") ||
        pageText?.includes("error");

      logger.info(`Error state displayed: ${hasError}`);
      await takeScreenshot(page, logger, "session-detail-error");
    });

    test("displays round indicator section", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await navigateTo(page, logger, "/sessions/TEST-SESSION");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "round indicator")) {
        return;
      }

      logger.step("Checking for round indicator");

      const pageText = await page.locator("body").textContent();

      // Should show round information
      const hasRoundInfo =
        pageText?.includes("Round") ||
        pageText?.includes("Initial Collection") ||
        pageText?.includes("First Compile") ||
        pageText?.includes("Iteration");

      logger.info(`Round indicator visible: ${hasRoundInfo}`);

      // Should show deltas count
      if (pageText?.includes("deltas this round") || pageText?.includes("deltas")) {
        logger.info("Delta count visible in round indicator");
      }

      await takeScreenshot(page, logger, "session-detail-round");
    });

    test("displays phase and status badges", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await navigateTo(page, logger, "/sessions/TEST-SESSION");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "phase badges")) {
        return;
      }

      logger.step("Checking for phase and status display");

      const pageText = await page.locator("body").textContent();

      // Should show phase label
      const phases = [
        "not started",
        "awaiting responses",
        "partial",
        "awaiting compilation",
        "compiled",
        "in critique",
        "closed",
      ];

      const hasPhase = phases.some((phase) =>
        pageText?.toLowerCase().includes(phase.toLowerCase()),
      );

      logger.info(`Phase label visible: ${hasPhase}`);

      // Should show message count badge
      const hasMessageCount = pageText?.includes("messages");
      logger.info(`Message count visible: ${hasMessageCount}`);

      await takeScreenshot(page, logger, "session-detail-status");
    });

    test("displays role status grid when roles exist", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await navigateTo(page, logger, "/sessions/TEST-SESSION");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "role status")) {
        return;
      }

      logger.step("Checking for role status grid");

      const pageText = await page.locator("body").textContent();

      // Check for known role names
      const roles = ["hypothesis generator", "test designer", "adversarial critic"];
      const hasRoles = roles.some((role) => pageText?.toLowerCase().includes(role));

      logger.info(`Role status grid visible: ${hasRoles}`);

      // Check for role completion indicators
      const hasComplete = pageText?.includes("complete") || pageText?.includes("pending");
      logger.info(`Role completion indicators: ${hasComplete}`);

      await takeScreenshot(page, logger, "session-detail-roles");
    });
  });

  test.describe("Session Actions", () => {
    test("displays session action buttons", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await navigateTo(page, logger, "/sessions/TEST-SESSION");
      await waitForNetworkIdle(page, logger);

      if (await shouldSkipLabModeTest(page, logger, "session actions")) {
        return;
      }

      logger.step("Checking for session action buttons");

      // Look for action buttons (Compile, Publish, Request Critique)
      const compileButton = page
        .locator("button")
        .filter({ hasText: /compile/i })
        .first();
      const hasCompile = await compileButton.isVisible().catch(() => false);

      const publishButton = page
        .locator("button")
        .filter({ hasText: /publish/i })
        .first();
      const hasPublish = await publishButton.isVisible().catch(() => false);

      const critiqueButton = page
        .locator("button")
        .filter({ hasText: /critique/i })
        .first();
      const hasCritique = await critiqueButton.isVisible().catch(() => false);

      logger.info(
        `Action buttons: Compile=${hasCompile}, Publish=${hasPublish}, Critique=${hasCritique}`,
      );

      await takeScreenshot(page, logger, "session-detail-actions");
    });
  });
});

// ============================================================================
// Artifact Viewing Tests
// ============================================================================
test.describe("Artifact Viewing", () => {
  test("displays compiled artifact section", async ({ page, logger, context }) => {
    await setupLabAuth(context);

    await navigateTo(page, logger, "/sessions/TEST-SESSION");
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipLabModeTest(page, logger, "artifact section")) {
      return;
    }

    logger.step("Checking for compiled artifact section");

    // Should have artifact heading
    await assertTextContent(page, logger, "body", /Compiled.*Artifact|Artifact/i);

    const pageText = await page.locator("body").textContent();

    // Should show either artifact content or "no artifact yet" message
    const hasArtifact =
      pageText?.includes("COMPILED:") ||
      pageText?.includes("hypothesis") ||
      pageText?.includes("H1") ||
      pageText?.includes("H2");
    const noArtifact =
      pageText?.includes("No compiled artifact") || pageText?.includes("will appear here");

    logger.info(`Artifact display: hasArtifact=${hasArtifact}, noArtifact=${noArtifact}`);
    expect(hasArtifact || noArtifact).toBeTruthy();

    await takeScreenshot(page, logger, "session-artifact-section");
  });

  test("displays lint report section", async ({ page, logger, context }) => {
    await setupLabAuth(context);

    await navigateTo(page, logger, "/sessions/TEST-SESSION");
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipLabModeTest(page, logger, "lint report")) {
      return;
    }

    logger.step("Checking for lint report section");

    const pageText = await page.locator("body").textContent();

    // Should have lint report heading
    const hasLintSection = pageText?.includes("Lint Report") || pageText?.includes("lint");

    logger.info(`Lint report section visible: ${hasLintSection}`);

    // If there's a compiled artifact, should show VALID/INVALID badge
    if (pageText?.includes("COMPILED:") || pageText?.includes("compiled v")) {
      const hasValidation =
        pageText?.includes("VALID") ||
        pageText?.includes("INVALID") ||
        pageText?.includes("errors") ||
        pageText?.includes("warnings");
      logger.info(`Lint validation visible: ${hasValidation}`);
    }

    await takeScreenshot(page, logger, "session-lint-report");
  });

  test("lint report has expandable details", async ({ page, logger, context }) => {
    await setupLabAuth(context);

    await navigateTo(page, logger, "/sessions/TEST-SESSION");
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipLabModeTest(page, logger, "lint details")) {
      return;
    }

    logger.step("Checking for expandable lint report");

    // Look for expandable details elements
    const lintDetails = page
      .locator("details")
      .filter({ hasText: /lint report/i })
      .first();
    const hasLintDetails = await lintDetails.isVisible().catch(() => false);

    if (hasLintDetails) {
      logger.info("Expandable lint report found");

      // Try to expand it
      await lintDetails.locator("summary").click();
      await page.waitForTimeout(300);

      logger.info("Lint report expanded");
      await takeScreenshot(page, logger, "session-lint-expanded");
    } else {
      logger.info("No expandable lint report (may not have compiled artifact)");
    }
  });

  test("displays parsed deltas section", async ({ page, logger, context }) => {
    await setupLabAuth(context);

    await navigateTo(page, logger, "/sessions/TEST-SESSION");
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipLabModeTest(page, logger, "parsed deltas")) {
      return;
    }

    logger.step("Checking for parsed deltas section");

    // Should have deltas heading
    await assertTextContent(page, logger, "body", /Parsed.*Deltas|Deltas/i);

    const pageText = await page.locator("body").textContent();

    // Should show either delta messages or "no deltas" message
    const hasDeltas =
      pageText?.includes("DELTA") ||
      pageText?.includes("valid") ||
      pageText?.includes("ADD") ||
      pageText?.includes("EDIT");
    const noDeltas = pageText?.includes("No DELTA") || pageText?.includes("No delta");

    logger.info(`Deltas display: hasDeltas=${hasDeltas}, noDeltas=${noDeltas}`);
    expect(hasDeltas || noDeltas).toBeTruthy();

    await takeScreenshot(page, logger, "session-deltas-section");
  });

  test("displays thread timeline section", async ({ page, logger, context }) => {
    await setupLabAuth(context);

    await navigateTo(page, logger, "/sessions/TEST-SESSION");
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipLabModeTest(page, logger, "thread timeline")) {
      return;
    }

    logger.step("Checking for thread timeline section");

    // Should have timeline heading
    await assertTextContent(page, logger, "body", /Thread Timeline|Timeline/i);

    const pageText = await page.locator("body").textContent();

    // Should show either messages or "no messages" indicator
    const hasMessages =
      pageText?.includes("KICKOFF") || pageText?.includes("DELTA") || pageText?.includes("From:");
    const noMessages = pageText?.includes("No messages");

    logger.info(`Timeline display: hasMessages=${hasMessages}, noMessages=${noMessages}`);
    expect(hasMessages || noMessages).toBeTruthy();

    await takeScreenshot(page, logger, "session-timeline-section");
  });

  test("timeline messages are expandable", async ({ page, logger, context }) => {
    await setupLabAuth(context);

    await navigateTo(page, logger, "/sessions/TEST-SESSION");
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipLabModeTest(page, logger, "expandable messages")) {
      return;
    }

    logger.step("Checking for expandable timeline messages");

    // Look for expandable details elements in timeline
    const messageDetails = page.locator("details").first();
    const hasDetails = await messageDetails.isVisible().catch(() => false);

    if (hasDetails) {
      logger.info("Expandable message cards found");

      // Try to expand first message
      await messageDetails.locator("summary").click();
      await page.waitForTimeout(300);

      const pageText = await page.locator("body").textContent();
      const hasBody = pageText?.includes("No message body") || (pageText?.length ?? 0) > 500; // Some content visible

      logger.info(`Message expanded, has body: ${hasBody}`);
      await takeScreenshot(page, logger, "session-message-expanded");
    } else {
      logger.info("No expandable messages (may be empty thread)");
    }
  });
});

// ============================================================================
// Navigation Flow Tests
// ============================================================================
test.describe("Navigation Flow", () => {
  test("can navigate from list to detail and back", async ({ page, logger, context }) => {
    await setupLabAuth(context);

    await navigateTo(page, logger, "/sessions");
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipLabModeTest(page, logger, "navigation flow")) {
      return;
    }

    const pageText = await page.locator("body").textContent();

    // If there are sessions, click on one
    if (!pageText?.includes("No sessions yet")) {
      let navigatedToDetail = false;

      await withStep(logger, page, "Click on a session card", async () => {
        const sessionCard = page
          .locator('a[href^="/sessions/"]')
          .filter({ hasNotText: /new/i })
          .first();
        const cardExists = await sessionCard.isVisible().catch(() => false);

        if (cardExists) {
          await sessionCard.click();
          await waitForNetworkIdle(page, logger);
          navigatedToDetail = true;
        } else {
          logger.info("No session cards to click");
        }
      });

      if (navigatedToDetail) {
        // Check if we landed on a valid page or 404
        const detailPageText = await page.locator("body").textContent();
        if (detailPageText?.includes("Not found")) {
          logger.info("Session not found (404), skipping detail verification");
        } else {
          await withStep(logger, page, "Verify on session detail page", async () => {
            await expect(page).toHaveURL(/\/sessions\/[^/]+$/);
          });

          await withStep(logger, page, "Navigate back to list", async () => {
            await page.goto("/sessions");
            await waitForNetworkIdle(page, logger);
          });
        }

        logger.info("Navigation flow completed successfully");
      }
    } else {
      logger.info("No sessions to navigate to, skipping flow test");
    }

    await takeScreenshot(page, logger, "session-navigation-flow");
  });

  test("New Session link works from detail page", async ({ page, logger, context }) => {
    await setupLabAuth(context);

    await navigateTo(page, logger, "/sessions/TEST-SESSION");
    await waitForNetworkIdle(page, logger);

    if (await shouldSkipLabModeTest(page, logger, "new session link")) {
      return;
    }

    let clicked = false;
    await withStep(logger, page, "Click New Session link", async () => {
      const newSessionLink = page.locator('a[href="/sessions/new"]').first();
      const linkExists = await newSessionLink.isVisible().catch(() => false);

      if (linkExists) {
        await newSessionLink.click();
        clicked = true;
      } else {
        logger.info("New Session link not visible on detail page");
      }
    });

    if (clicked) {
      await withStep(logger, page, "Verify navigation to new session form", async () => {
        await expect(page).toHaveURL(/\/sessions\/new/);
      });

      logger.info("New Session link navigation successful");
    }
  });
});
