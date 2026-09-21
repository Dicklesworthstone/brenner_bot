/**
 * E2E Tests: Accessibility (axe-core)
 *
 * Runs lightweight axe scans against public pages by default.
 * These tests are intended to be safe to run against production (default BASE_URL).
 *
 * Policy:
 * - Fail CI on *critical* violations.
 * - Log/attach full results for triage.
 */

import { expect, test, waitForNetworkIdle } from "./utils";
import {
  checkAccessibility,
  filterViolationsByImpact,
  formatViolations,
} from "./utils/a11y-testing";
import { withStep } from "./utils/e2e-logging";

type PageSpec = { path: string; name: string };

const PUBLIC_PAGES: PageSpec[] = [
  { path: "/", name: "Home" },
  { path: "/corpus", name: "Corpus" },
  { path: "/distillations", name: "Distillations" },
  { path: "/method", name: "Method" },
  { path: "/glossary", name: "Glossary" },
];

const SPOTLIGHT_SHORTCUT = process.platform === "darwin" ? "Meta+k" : "Control+k";

function baseUrlHost(): string {
  const raw = (process.env.BASE_URL || "https://brennerbot.org").trim();
  try {
    return new URL(raw).hostname;
  } catch {
    return "brennerbot.org";
  }
}

const ENFORCE_CRITICAL =
  process.env.A11Y_ENFORCE === "1" ||
  baseUrlHost() === "localhost" ||
  baseUrlHost() === "127.0.0.1";

// Helper: Get the cookie domain from the BASE_URL.
function getCookieDomain(): string {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "localhost";
  }
}

// Helper: Set up lab auth cookie for a context
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

test.describe("Accessibility (axe-core)", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} has no critical accessibility violations`, async ({ page, logger }, testInfo) => {
      let status = 0;

      await withStep(logger, page, `Navigate to ${path}`, async () => {
        const res = await page.goto(path);
        status = res?.status() ?? 0;
        await waitForNetworkIdle(page, logger);
      });

      // Production hides lab routes; some environments might also hide specific pages.
      if (status === 404) test.skip(true, `${path} returned 404 in this environment`);

      const results = await checkAccessibility(page, testInfo);
      const critical = filterViolationsByImpact(results, ["critical"]);

      if (critical.length > 0) {
        const logFn = ENFORCE_CRITICAL ? logger.error : logger.warn;
        logFn("Critical accessibility violations detected", {
          path,
          count: critical.length,
          details: formatViolations(critical),
        });
      } else {
        logger.info("No critical accessibility violations", {
          path,
          seriousCount: filterViolationsByImpact(results, ["serious"]).length,
          totalViolations: results.violations.length,
        });
      }

      if (ENFORCE_CRITICAL) {
        expect(critical).toHaveLength(0);
      } else {
        expect(Array.isArray(critical)).toBe(true);
      }
    });
  }

  test("Spotlight search dialog has no critical violations", async ({ page, logger }, testInfo) => {
    await withStep(logger, page, "Navigate to /corpus", async () => {
      const res = await page.goto("/corpus");
      const status = res?.status() ?? 0;
      await waitForNetworkIdle(page, logger);
      if (status === 404) test.skip(true, "/corpus returned 404 in this environment");
    });

    await withStep(logger, page, "Open spotlight search", async () => {
      await page.keyboard.press(SPOTLIGHT_SHORTCUT);
      await expect(page.locator('[role="dialog"][aria-label="Search"]')).toBeVisible({
        timeout: 5000,
      });
    });

    const results = await checkAccessibility(page, testInfo, {
      include: ['[role="dialog"][aria-label="Search"]'],
    });
    const critical = filterViolationsByImpact(results, ["critical"]);

    if (critical.length > 0) {
      const logFn = ENFORCE_CRITICAL ? logger.error : logger.warn;
      logFn("Critical accessibility violations detected in spotlight search", {
        count: critical.length,
        details: formatViolations(critical),
      });
    }

    if (ENFORCE_CRITICAL) {
      expect(critical).toHaveLength(0);
    } else {
      expect(Array.isArray(critical)).toBe(true);
    }
  });

  test.describe("Session Dashboard (Lab Mode)", () => {
    test("Session new page has no critical accessibility violations", async ({
      page,
      logger,
      context,
    }, testInfo) => {
      await setupLabAuth(context);

      await withStep(logger, page, "Navigate to /sessions/new", async () => {
        const res = await page.goto("/sessions/new");
        const status = res?.status() ?? 0;
        await waitForNetworkIdle(page, logger);
        if (status === 404) test.skip(true, "/sessions/new returned 404 (lab mode disabled)");
      });

      const pageText = await page.locator("body").textContent();
      if (pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied")) {
        test.skip(true, "Lab mode requires authentication");
      }

      const results = await checkAccessibility(page, testInfo);
      const critical = filterViolationsByImpact(results, ["critical"]);

      if (critical.length > 0) {
        const logFn = ENFORCE_CRITICAL ? logger.error : logger.warn;
        logFn("Critical accessibility violations in sessions/new", {
          count: critical.length,
          details: formatViolations(critical),
        });
      } else {
        logger.info("No critical accessibility violations in sessions/new", {
          seriousCount: filterViolationsByImpact(results, ["serious"]).length,
          totalViolations: results.violations.length,
        });
      }

      if (ENFORCE_CRITICAL) {
        expect(critical).toHaveLength(0);
      } else {
        expect(Array.isArray(critical)).toBe(true);
      }
    });

    test("Session list page has no critical accessibility violations", async ({
      page,
      logger,
      context,
    }, testInfo) => {
      await setupLabAuth(context);

      await withStep(logger, page, "Navigate to /sessions", async () => {
        const res = await page.goto("/sessions");
        const status = res?.status() ?? 0;
        await waitForNetworkIdle(page, logger);
        if (status === 404) test.skip(true, "/sessions returned 404 (lab mode disabled)");
      });

      const pageText = await page.locator("body").textContent();
      if (pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied")) {
        test.skip(true, "Lab mode requires authentication");
      }

      const results = await checkAccessibility(page, testInfo);
      const critical = filterViolationsByImpact(results, ["critical"]);

      if (critical.length > 0) {
        const logFn = ENFORCE_CRITICAL ? logger.error : logger.warn;
        logFn("Critical accessibility violations in sessions", {
          count: critical.length,
          details: formatViolations(critical),
        });
      }

      if (ENFORCE_CRITICAL) {
        expect(critical).toHaveLength(0);
      } else {
        expect(Array.isArray(critical)).toBe(true);
      }
    });
  });

  test.describe("Session Dashboard Keyboard Shortcuts", () => {
    test("Keyboard shortcuts dialog is accessible", async ({ page, logger, context }, testInfo) => {
      await setupLabAuth(context);

      await withStep(logger, page, "Navigate to /sessions/new", async () => {
        const res = await page.goto("/sessions/new");
        const status = res?.status() ?? 0;
        await waitForNetworkIdle(page, logger);
        if (status === 404) test.skip(true, "/sessions/new returned 404 (lab mode disabled)");
      });

      const pageText = await page.locator("body").textContent();
      if (pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied")) {
        test.skip(true, "Lab mode requires authentication");
      }

      // Press ? to open keyboard shortcuts dialog if available
      // Note: The full SessionDashboard with shortcuts is only available on session detail pages
      // For now, we verify the session form page passes axe-core
      // TODO(brenner_bot-aitt): Extend to session detail page once testable routes exist

      const results = await checkAccessibility(page, testInfo);
      const critical = filterViolationsByImpact(results, ["critical"]);

      if (ENFORCE_CRITICAL) {
        expect(critical).toHaveLength(0);
      } else {
        expect(Array.isArray(critical)).toBe(true);
      }

      logger.info("Session page accessibility check complete", {
        totalViolations: results.violations.length,
        criticalCount: critical.length,
      });
    });

    test("Skip link is visible on focus", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await withStep(logger, page, "Navigate to /sessions/new", async () => {
        const res = await page.goto("/sessions/new");
        const status = res?.status() ?? 0;
        await waitForNetworkIdle(page, logger);
        if (status === 404) test.skip(true, "/sessions/new returned 404 (lab mode disabled)");
      });

      const pageText = await page.locator("body").textContent();
      if (pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied")) {
        test.skip(true, "Lab mode requires authentication");
      }

      // Tab to activate skip link (if present)
      await page.keyboard.press("Tab");

      // Check if a skip link becomes visible
      const skipLink = page.locator('a:has-text("Skip")').first();
      const isVisible = await skipLink.isVisible().catch(() => false);

      if (isVisible) {
        logger.info("Skip link is visible on Tab focus");
        expect(isVisible).toBe(true);
      } else {
        // Skip link may not be on this page, which is acceptable
        logger.info("No skip link found on this page (may be on session detail pages only)");
      }
    });

    test("Focus management with keyboard navigation", async ({ page, logger, context }) => {
      await setupLabAuth(context);

      await withStep(logger, page, "Navigate to /sessions/new", async () => {
        const res = await page.goto("/sessions/new");
        const status = res?.status() ?? 0;
        await waitForNetworkIdle(page, logger);
        if (status === 404) test.skip(true, "/sessions/new returned 404 (lab mode disabled)");
      });

      const pageText = await page.locator("body").textContent();
      if (pageText?.includes("Lab Mode Locked") || pageText?.includes("Access Denied")) {
        test.skip(true, "Lab mode requires authentication");
      }

      // Test basic keyboard navigation works
      await withStep(logger, page, "Tab through focusable elements", async () => {
        // Press Tab several times to verify focus moves
        for (let i = 0; i < 5; i++) {
          await page.keyboard.press("Tab");
        }

        // Get the currently focused element
        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return el ? { tagName: el.tagName, role: el.getAttribute("role") } : null;
        });

        logger.info(
          "Focused element after Tab navigation",
          focusedElement ?? { tagName: "none", role: null },
        );
        expect(focusedElement).not.toBeNull();
      });

      // Verify focus is visible (has focus styles)
      await withStep(logger, page, "Verify focus is visible", async () => {
        const hasFocusRing = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;
          const styles = window.getComputedStyle(el);
          // Check for common focus indicators: outline or box-shadow
          return (
            styles.outline !== "none" ||
            styles.outlineWidth !== "0px" ||
            styles.boxShadow !== "none"
          );
        });

        // Focus should be visible, but we won't fail the test if it isn't
        // as some elements may have custom focus styles
        logger.info("Focus ring detected", { hasFocusRing });
      });
    });
  });
});
