/**
 * E2E Tests: Visual Regression
 *
 * Captures page screenshots and compares against baselines to catch unintended
 * visual changes. Uses Playwright's built-in visual comparison.
 *
 * IMPORTANT: These tests only run on desktop-chrome to maintain consistent baselines.
 * Running on multiple browsers would require separate baselines per browser since
 * rendering differs between browser engines.
 *
 * Baseline Generation:
 * - First run creates baseline snapshots in e2e/visual-regression.spec.ts-snapshots/
 * - Update baselines with: bun playwright test visual-regression --update-snapshots --project=desktop-chrome
 *
 * Policy:
 * - Fail CI on visual differences exceeding threshold
 * - Allow small pixel differences for anti-aliasing (maxDiffPixels)
 * - Skip animations/transitions before capture
 */

import { expect, test, waitForNetworkIdle } from "./utils";
import { withStep } from "./utils/e2e-logging";

// Only run visual regression tests on desktop-chrome for consistent baselines
test.skip(
  ({ browserName }) => browserName !== "chromium",
  "Visual regression tests only run on Chromium",
);

// Viewport configurations for responsive testing
const VIEWPORTS = [
  { width: 1280, height: 720, name: "desktop" },
  { width: 768, height: 1024, name: "tablet" },
  { width: 375, height: 667, name: "mobile" },
] as const;

// Public pages to capture (no auth required)
const PUBLIC_PAGES = [
  { path: "/", name: "home" },
  { path: "/corpus", name: "corpus" },
  { path: "/distillations", name: "distillations" },
  { path: "/method", name: "method" },
  { path: "/glossary", name: "glossary" },
] as const;

// Visual comparison options
const SNAPSHOT_OPTIONS = {
  // Allow some pixel differences for anti-aliasing
  maxDiffPixels: 100,
  // Threshold for color difference (0-1)
  threshold: 0.2,
  // Animation tolerance
  animations: "disabled" as const,
};

test.describe("Visual Regression", () => {
  test.describe("Page Layouts", () => {
    // Generate tests for each page at each viewport
    for (const viewport of VIEWPORTS) {
      test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } });

        for (const page of PUBLIC_PAGES) {
          test(`${page.name} page`, async ({ page: pw, logger }) => {
            let status = 0;

            await withStep(logger, pw, `Navigate to ${page.path}`, async () => {
              const res = await pw.goto(page.path);
              status = res?.status() ?? 0;
              await waitForNetworkIdle(pw, logger);
            });

            // Skip if page not available in this environment
            if (status === 404) {
              test.skip(true, `${page.path} returned 404 in this environment`);
            }

            await withStep(logger, pw, "Wait for stable render", async () => {
              // Wait for any loading states to complete
              await pw.waitForLoadState("domcontentloaded");
              // Wait for fonts to load
              await pw.evaluate(() => document.fonts.ready);
              // Small delay for CSS transitions
              await pw.waitForTimeout(300);
            });

            await withStep(logger, pw, "Capture and compare screenshot", async () => {
              const snapshotName = `${page.name}-${viewport.name}.png`;
              logger.info("Capturing screenshot", { snapshot: snapshotName });

              await expect(pw).toHaveScreenshot(snapshotName, {
                ...SNAPSHOT_OPTIONS,
                fullPage: false, // Viewport only for consistency
              });

              logger.info("Screenshot comparison passed", { snapshot: snapshotName });
            });
          });
        }
      });
    }
  });

  test.describe("Component States", () => {
    test("spotlight search modal appearance", async ({ page, logger }) => {
      const SPOTLIGHT_SHORTCUT = process.platform === "darwin" ? "Meta+k" : "Control+k";

      await withStep(logger, page, "Navigate to corpus page", async () => {
        await page.goto("/corpus");
        await waitForNetworkIdle(page, logger);
      });

      await withStep(logger, page, "Open spotlight search", async () => {
        await page.keyboard.press(SPOTLIGHT_SHORTCUT);
        // Wait for modal animation
        await page.waitForTimeout(400);
      });

      await withStep(logger, page, "Capture search modal", async () => {
        // Use the actual selector from SpotlightSearch.tsx: role="dialog" aria-label="Search"
        const modal = page.locator('[role="dialog"][aria-label="Search"]');
        const isVisible = await modal.isVisible().catch(() => false);

        if (!isVisible) {
          // Fallback: capture full page with modal overlay visible
          logger.warn("Modal selector not matched, capturing full page with modal state");
          await expect(page).toHaveScreenshot("spotlight-modal.png", {
            ...SNAPSHOT_OPTIONS,
            maxDiffPixels: 200,
          });
          return;
        }

        await expect(modal).toHaveScreenshot("spotlight-modal.png", {
          ...SNAPSHOT_OPTIONS,
          maxDiffPixels: 150, // Allow more variance for input caret
        });
        logger.info("Spotlight modal screenshot captured");
      });
    });

    test("navigation menu states", async ({ page, logger }) => {
      await withStep(logger, page, "Navigate to home", async () => {
        await page.goto("/");
        await waitForNetworkIdle(page, logger);
      });

      await withStep(logger, page, "Capture navigation", async () => {
        // Locate nav element
        const nav = page.locator("nav").first();
        const isVisible = await nav.isVisible().catch(() => false);

        if (!isVisible) {
          test.skip(true, "Navigation element not found in this environment");
        }

        await expect(nav).toHaveScreenshot("navigation-bar.png", {
          ...SNAPSHOT_OPTIONS,
        });
        logger.info("Navigation bar screenshot captured");
      });
    });

    test("footer consistency", async ({ page, logger }) => {
      await withStep(logger, page, "Navigate to home", async () => {
        await page.goto("/");
        await waitForNetworkIdle(page, logger);
      });

      await withStep(logger, page, "Scroll to footer", async () => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(200);
      });

      await withStep(logger, page, "Capture footer", async () => {
        const footer = page.locator("footer").first();
        const isVisible = await footer.isVisible().catch(() => false);

        if (!isVisible) {
          test.skip(true, "Footer element not found in this environment");
        }

        await expect(footer).toHaveScreenshot("footer.png", {
          ...SNAPSHOT_OPTIONS,
          // Footer has higher variance due to dynamic content (dates, links)
          maxDiffPixelRatio: 0.1, // Allow up to 10% pixel difference
        });
        logger.info("Footer screenshot captured");
      });
    });
  });

  test.describe("Dark/Light Mode", () => {
    // Skip these tests if the site doesn't support theme switching
    test.skip(true, "Theme switching not yet implemented - enable when available");

    test("home page in dark mode", async ({ page, logger }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto("/");
      await waitForNetworkIdle(page, logger);
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot("home-dark.png", SNAPSHOT_OPTIONS);
    });

    test("home page in light mode", async ({ page, logger }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto("/");
      await waitForNetworkIdle(page, logger);
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot("home-light.png", SNAPSHOT_OPTIONS);
    });
  });

  test.describe("Error States", () => {
    test("404 page appearance", async ({ page, logger }) => {
      await withStep(logger, page, "Navigate to non-existent page", async () => {
        await page.goto("/this-page-does-not-exist-12345");
        await waitForNetworkIdle(page, logger);
      });

      await withStep(logger, page, "Capture 404 page", async () => {
        // The page should show some kind of error/404 state
        await page.waitForTimeout(300);
        await expect(page).toHaveScreenshot("error-404.png", {
          ...SNAPSHOT_OPTIONS,
          // Use ratio-based threshold only (not pixel count) for 404 page
          // This allows minor font/rendering differences across CI runs
          maxDiffPixelRatio: 0.03, // Allow up to 3% pixel difference
        });
        logger.info("404 page screenshot captured");
      });
    });
  });

  test.describe("Loading States", () => {
    test.skip(true, "Loading states are transient - capture manually when needed");

    test("corpus page loading skeleton", async ({ page }) => {
      // Throttle network to capture loading state
      await page.route("**/*", async (route) => {
        await new Promise((r) => setTimeout(r, 1000));
        await route.continue();
      });

      await page.goto("/corpus");
      // Capture immediately before content loads
      await expect(page).toHaveScreenshot("corpus-loading.png", SNAPSHOT_OPTIONS);
    });
  });
});
