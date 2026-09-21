/**
 * E2E Test Fixtures
 *
 * Extends Playwright's base test with logging and common utilities.
 * Philosophy: Every test should produce detailed, actionable output.
 */

import { test as base, expect, type Page, type Response } from "@playwright/test";
import {
  attachLogsToTest,
  clearTestContext,
  createE2ELogger,
  setupConsoleLogging,
  withStep,
} from "./e2e-logging";
import {
  attachNetworkLogsToTest,
  clearNetworkContext,
  collectPerformanceTiming,
  setupNetworkLogging,
} from "./network-logging";

// Lazy import to avoid loading agent-mail-seeder during config phase
// This prevents Playwright from trying to load test server code during test discovery
type AgentMailSeederModule = typeof import("./agent-mail-seeder");
let agentMailSeeder: AgentMailSeederModule | null = null;

async function getAgentMailSeeder(): Promise<AgentMailSeederModule> {
  if (!agentMailSeeder) {
    agentMailSeeder = await import("./agent-mail-seeder");
  }
  return agentMailSeeder;
}

// Import and re-export SessionConfig type
import type { SessionConfig } from "./agent-mail-seeder";

export type { SessionConfig };

/**
 * Test session fixture for Agent Mail integration.
 */
export interface TestSessionFixture {
  /** Seed a test session with messages */
  seed: (config: SessionConfig) => Promise<void>;
  /** Clean up a seeded session */
  cleanup: (threadId: string) => Promise<void>;
  /** Get the test server URL */
  getServerUrl: () => string;
  /** List of seeded session thread IDs for cleanup */
  seededSessions: string[];
}

/**
 * Extended test fixtures with logging and Agent Mail test session support.
 */
export const test = base.extend<{
  logger: ReturnType<typeof createE2ELogger>;
  testSession: TestSessionFixture;
}>({
  logger: async ({ page }, provideLogger, testInfo) => {
    const logger = createE2ELogger(testInfo.title);
    logger.info(`Test started: ${testInfo.title}`);
    logger.debug("Test file", { file: testInfo.file });

    // Setup network logging for this test
    setupNetworkLogging(page, testInfo.title);
    logger.debug("Network logging enabled");

    // Setup browser console logging for this test
    setupConsoleLogging(page, testInfo.title);
    logger.debug("Console logging enabled");

    // Use the logger
    await provideLogger(logger);

    // Collect performance timing before cleanup
    try {
      await collectPerformanceTiming(page, testInfo.title);
    } catch {
      // Performance timing may fail if page is closed
    }

    // After test: attach logs
    logger.info(`Test finished: ${testInfo.status || "unknown"}`);

    try {
      await attachLogsToTest(testInfo, testInfo.title);
      await attachNetworkLogsToTest(testInfo, testInfo.title);
    } catch {
      // Ignore attachment errors
    }

    // Clean up
    clearTestContext(testInfo.title);
    clearNetworkContext(testInfo.title);
  },

  testSession: async ({}, provideFixture, testInfo) => {
    // Lazy-load the seeder module to avoid Playwright config-time loading issues
    const seeder = await getAgentMailSeeder();

    // Ensure test server is running
    await seeder.getTestServer();

    const seededSessions: string[] = [];

    const fixture: TestSessionFixture = {
      seed: async (config: SessionConfig) => {
        seededSessions.push(config.threadId);
        await seeder.seedTestSession(config);
      },
      cleanup: async (threadId: string) => {
        await seeder.cleanupTestSession(threadId);
      },
      getServerUrl: () => seeder.getTestServerUrl(),
      seededSessions,
    };

    // Provide the fixture
    await provideFixture(fixture);

    // Attach Agent Mail context on failures for easier debugging.
    if (testInfo.status !== "passed") {
      const serverUrl = (() => {
        try {
          return seeder.getTestServerUrl();
        } catch {
          return null;
        }
      })();

      if (serverUrl) {
        await testInfo.attach("agent-mail-test-server-url.txt", {
          body: serverUrl,
          contentType: "text/plain",
        });

        const readResource = async (uri: string): Promise<string | null> => {
          try {
            const res = await fetch(serverUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now().toString(),
                method: "resources/read",
                params: { uri },
              }),
            });
            if (!res.ok) return null;
            const json = await res.json();
            const text = json?.result?.contents?.[0]?.text;
            return typeof text === "string" ? text : null;
          } catch {
            return null;
          }
        };

        const logsJson = await readResource("resource://logs?limit=2000");
        if (logsJson) {
          await testInfo.attach("agent-mail-rpc-log.json", {
            body: logsJson,
            contentType: "application/json",
          });
        }

        const projectKey = encodeURIComponent("/data/projects/brenner_bot");
        for (const threadId of seededSessions) {
          const uri = `resource://thread/${encodeURIComponent(threadId)}?project=${projectKey}&include_bodies=true`;
          const threadJson = await readResource(uri);
          if (!threadJson) continue;
          await testInfo.attach(`agent-mail-thread-${threadId}.json`, {
            body: threadJson,
            contentType: "application/json",
          });
        }
      }
    }

    // Cleanup after test
    for (const threadId of seededSessions) {
      await seeder.cleanupTestSession(threadId);
    }

    // Reset server state for next test
    seeder.resetTestServer();
  },
});

export { expect };

/**
 * Helper: Navigate and log the action.
 */
export async function navigateTo(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  path: string,
  options?: { waitUntil?: "load" | "networkidle" | "domcontentloaded" },
): Promise<Response | null> {
  return await withStep(logger, page, `Navigate to ${path}`, async () => {
    return await page.goto(path, { waitUntil: options?.waitUntil || "networkidle" });
  });
}

/**
 * Helper: Wait for content and log.
 */
export async function waitForContent(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string,
  options?: { timeout?: number },
): Promise<void> {
  await withStep(logger, page, `Wait for: ${selector}`, async () => {
    await page
      .locator(selector)
      .first()
      .waitFor({
        state: "visible",
        timeout: options?.timeout || 10000,
      });
  });
}

/**
 * Helper: Click and log.
 */
export async function clickElement(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string | ReturnType<Page["locator"]>,
  description?: string,
): Promise<void> {
  const locator = typeof selector === "string" ? page.locator(selector) : selector;
  const desc = description || (typeof selector === "string" ? selector : "element");

  await withStep(logger, page, `Click: ${desc}`, async () => {
    await locator.click();
  });
}

/**
 * Helper: Fill input and log.
 */
export async function fillInput(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string,
  value: string,
  description?: string,
): Promise<void> {
  const desc = description || selector;

  await withStep(logger, page, `Fill: ${desc}`, async () => {
    await page.locator(selector).fill(value);
  });
}

/**
 * Helper: Take a screenshot and log.
 * Screenshot failures are logged as warnings, not errors - they're diagnostic, not critical.
 */
export async function takeScreenshot(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  name: string,
  options?: { fullPage?: boolean },
): Promise<void> {
  await withStep(logger, page, `Screenshot: ${name}`, async () => {
    const fullPage = options?.fullPage ?? true;
    try {
      await page.screenshot({
        path: `./screenshots/${name}.png`,
        fullPage,
      });
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : String(err);
      // Screenshot failures are diagnostic; don't fail the test.
      // If fullPage capture fails (common for very tall pages), fall back to viewport.
      if (fullPage) {
        const sizeHint = errMessage.includes("32767") ? " (too large)" : "";
        logger.warn(`Full page screenshot failed${sizeHint}, falling back to viewport: ${name}`);
        try {
          await page.screenshot({
            path: `./screenshots/${name}.png`,
            fullPage: false,
          });
        } catch (fallbackErr) {
          const fallbackMessage =
            fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
          logger.warn(`Screenshot failed (viewport fallback): ${name} - ${fallbackMessage}`);
        }
        return;
      }

      logger.warn(`Screenshot failed: ${name} - ${errMessage}`);
    }
  });
}

/**
 * Helper: Assert text content and log.
 */
export async function assertTextContent(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string,
  expectedText: string | RegExp,
  description?: string,
): Promise<void> {
  const desc = description || `${selector} contains "${expectedText}"`;

  await withStep(logger, page, `Assert: ${desc}`, async () => {
    const locator = page.locator(selector);
    if (typeof expectedText === "string") {
      await expect(locator).toContainText(expectedText);
    } else {
      await expect(locator).toContainText(expectedText);
    }
  });
}

/**
 * Helper: Assert element count and log.
 */
export async function assertElementCount(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  selector: string,
  expectedCount: number | { min?: number; max?: number },
  description?: string,
): Promise<void> {
  const desc = description || `${selector} count matches`;

  await withStep(logger, page, `Assert count: ${desc}`, async () => {
    const locator = page.locator(selector);
    const count = await locator.count();

    if (typeof expectedCount === "number") {
      expect(count).toBe(expectedCount);
    } else {
      if (expectedCount.min !== undefined) {
        expect(count).toBeGreaterThanOrEqual(expectedCount.min);
      }
      if (expectedCount.max !== undefined) {
        expect(count).toBeLessThanOrEqual(expectedCount.max);
      }
    }

    logger.debug(`Element count`, { selector, count, expected: expectedCount });
  });
}

/**
 * Helper: Assert URL and log.
 */
export async function assertUrl(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  expectedPath: string | RegExp,
): Promise<void> {
  await withStep(logger, page, `Assert URL: ${expectedPath}`, async () => {
    if (typeof expectedPath === "string") {
      await expect(page).toHaveURL(new RegExp(expectedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } else {
      await expect(page).toHaveURL(expectedPath);
    }
  });
}

/**
 * Helper: Wait for network idle.
 */
export async function waitForNetworkIdle(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  timeout?: number,
): Promise<void> {
  await withStep(logger, page, "Wait for network idle", async () => {
    await page.waitForLoadState("networkidle", { timeout: timeout || 30000 });
  });
}

/**
 * Helper: Check page has minimum content (not blank).
 */
export async function assertPageHasContent(
  page: Page,
  logger: ReturnType<typeof createE2ELogger>,
  minLength: number = 100,
): Promise<void> {
  await withStep(logger, page, `Assert page has content (min ${minLength} chars)`, async () => {
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.length).toBeGreaterThan(minLength);
    logger.debug("Page content length", { length: bodyText?.length });
  });
}
